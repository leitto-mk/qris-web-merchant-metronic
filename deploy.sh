#!/usr/bin/sh

new_version=""
no_build=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --no-build)
            no_build=true
            shift
            ;;
        --version=*)
            new_version="${1#*=}"
            shift
            ;;
        --version)
            if [[ -n "$2" ]]; then
                new_version="$2"
                shift 2
            else
                echo "Error: --version requires a value" >&2
                exit 1
            fi
            ;;
        --help)
            echo "Usage: deploy.sh [--version <VALUE>] [--no-build]"
            echo "Options:"
            echo "  --version   Specify the version (--version=VAL or --version VAL)"
            echo "  --no-build  Skip the Docker build & deploy step"
            echo "  --help      Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Refuse to deploy with uncommitted or untracked changes
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ Working tree is not clean. Commit or stash these changes before deploying:" >&2
    git status --short >&2
    exit 1
fi

# Prepare the changelogs
output_file="changelogs.txt"
temp_file="temp.txt"

# Get the latest existing tag from the changelogs file for reference
current_tag_from_file=$(head -n 1 "$output_file" 2>/dev/null || echo "")

# Determine the new version to use
if [ -z "$new_version" ]; then
    current_tag=${current_tag_from_file:-"0.0.1"}
    prefix=${current_tag%.*}
    last_digit=${current_tag##*.}
    new_last_digit=$((last_digit + 1))
    new_version="${prefix}.${new_last_digit}"
    echo "🚀 Increasing to new version: $new_version"

    # Use the latest tag from the file as the point to start logging from
    start_tag="$current_tag_from_file"
else
    echo "🚀 Using specified version: $new_version"

    # Find the commit hash for the specified version tag
    if git rev-parse --quiet --verify "refs/tags/$new_version" >/dev/null; then
        # The tag already exists, so we want to find the commits since that tag
        start_tag="$new_version"
    else
        # The specified version is new, so we'll start from the last tag in the file
        start_tag="$current_tag_from_file"
    fi
fi

# Store the old content of changelogs.txt in a temporary file
cp "$output_file" "$temp_file"

# Check if the new version is already at the top of the changelogs file
if grep -q "^$new_version$" "$output_file"; then
    echo "Updating existing version $new_version in changelogs."

    # Get the line number of the next version
    next_version_line=$(grep -n -m 2 '^[0-9]\+\.[0-9]\+\.[0-9]\+$' "$output_file" | tail -n 1 | cut -d: -f1)

    if [ -n "$next_version_line" ]; then
        # Keep everything from the next version onwards
        tail -n +$next_version_line "$output_file" > "$temp_file"
    else
        # If there is no next version, just empty the temporary file
        > "$temp_file"
    fi
else
    echo "Creating new changelog entry for version $new_version."
fi

# The start_tag for git log should be the first entry in the *new* changelogs.
# Let's get the latest existing tag from the *kept* content
new_start_tag=$(head -n 1 "$temp_file" 2>/dev/null || echo "")

# If the new_start_tag is empty, we get all commits; otherwise, we start from that tag
if [ -z "$new_start_tag" ]; then
    commits_to_process=$(git rev-list HEAD)
else
    commits_to_process=$(git rev-list "$new_start_tag"..HEAD)
fi


# Now let's generate the new log entries
new_log_entries=$(
    if [ -n "$commits_to_process" ]; then
        echo "$new_version"
        git log --pretty=format:"    - %s" "$new_start_tag"..HEAD | \
        grep -v 'auto-changelogs' | \
        grep -v 'update-changelogs' | \
        grep -v 'Merge remote-tracking' | \
        grep -v 'build-unrelated:' | \
        grep -v 'unrelated-build:' | \
        grep -v 'Revert'
    fi
)

# Combine the new commits with the existing (old) changelogs
if [ -n "$new_log_entries" ]; then
    echo "$new_log_entries" > "new_file.txt"
    cat "$temp_file" >> "new_file.txt"
    mv "new_file.txt" "$output_file"
fi

rm -f "$temp_file"

# Update changelogs
git tag --delete $new_version
git push origin --delete $new_version
git push personal --delete $new_version
git add .
git commit -m "auto-changelogs: $new_version"
git tag $new_version
git push origin
git push origin --tags
git push personal
git push personal --tags

if [ "$no_build" = true ]; then
    echo "Skipping Docker build & deploy step."
else
    echo "Building Docker image..."
    build_start=$(date +%s)
    image="container.banksulutgo.co.id:5000/web-merchant-fe"
    docker build -t "$image:latest" . || exit 1
    docker tag "$image:latest" "$image:$new_version"
    build_end=$(date +%s)
    build_duration=$((build_end - build_start))
    echo "✅ Docker build completed in ${build_duration}s"

    echo "Pushing Docker image..."
    push_start=$(date +%s)
    docker push "$image:latest"
    docker push "$image:$new_version"
    push_end=$(date +%s)
    push_duration=$((push_end - push_start))
    echo "✅ Docker push completed in ${push_duration}s"

    total_duration=$((push_end - build_start))
    echo "⏱️  Total build & push time: ${total_duration}s"
fi
