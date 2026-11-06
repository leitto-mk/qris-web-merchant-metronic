#!/usr/bin/env bash
# Versioning, changelog, git tag, then docker build & push (:latest + :<version>).
# Run ./deploy.sh --help for options. Without options in a terminal it asks interactively.
set -u

# ---------- per-repo config ----------
IMAGE="container.banksulutgo.co.id:5000/web-merchant-fe"
REMOTES=(origin personal)
ABOUT="QRIS Web Merchant front-end portal · React 19 + Vite, served by nginx"
BUILD_DESC="Build the React app into an nginx image, tag it :latest and the version, then push to the registry."
pre_build() { :; }
# --------------------------------------

CHANGELOG="changelogs.txt"
VERSION_RE='^[0-9]\+\.[0-9]\+\.[0-9]\+$'
export GIT_TERMINAL_PROMPT=0 # fail instead of hanging behind the spinner on a credential prompt

# ---------- ui ----------
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
    B=$'\e[1m' D=$'\e[2m' R=$'\e[0m' RED=$'\e[31m' GRN=$'\e[32m' YEL=$'\e[33m' CYN=$'\e[36m' MAG=$'\e[35m'
else
    B='' D='' R='' RED='' GRN='' YEL='' CYN='' MAG=''
fi
TTY=false; [ -t 0 ] && [ -t 1 ] && TTY=true
CR='' EL=''; $TTY && CR=$'\r' EL=$'\e[K'
LOG="${TMPDIR:-/tmp}/deploy-$(basename "$PWD")-$(date +%Y%m%d-%H%M%S).log"
JOB=''

cursor() { $TTY && printf '\e[?25%s' "$1"; }
trap 'cursor h' EXIT
trap '[ -n "$JOB" ] && kill "$JOB" 2>/dev/null; cursor h; printf "\n  %s✖ Cancelled%s\n" "$RED" "$R"; exit 130' INT

die()  { printf '  %s✖ %s%s\n' "$RED" "$*" "$R" >&2; exit 1; }
ok()   { printf '  %s✔%s %s\n' "$GRN" "$R" "$*"; }
warn() { printf '  %s!%s %s\n' "$YEL" "$R" "$*"; }
# section "Title" ["description"]
section() {
    printf '\n  %s▍%s %s%s%s\n' "$MAG" "$R" "$B" "$1" "$R"
    [ -n "${2:-}" ] && printf '  %s  %s%s\n' "$D" "$2" "$R"
    return 0
}

# run [--soft] "label" cmd... : spinner while cmd runs, output goes to $LOG.
# --soft: failure is shown as skipped instead of stopping the deploy.
run() {
    local soft=false; [ "$1" = --soft ] && { soft=true; shift; }
    local label=$1; shift
    local start=$SECONDS rc
    printf '\n$ %s\n' "$*" >>"$LOG"
    if $DRY_RUN; then
        printf '  %s○ %s  (dry-run)%s\n' "$D" "$label" "$R"; return 0
    fi
    "$@" >>"$LOG" 2>&1 &
    JOB=$!
    if $TTY; then
        local f=(⠋ ⠙ ⠹ ⠸ ⠼ ⠴ ⠦ ⠧ ⠇ ⠏) i=0
        cursor l
        while kill -0 "$JOB" 2>/dev/null; do
            printf '\r  %s%s%s %s %s%ss%s\e[K' "$CYN" "${f[i++ % 10]}" "$R" "$label" "$D" $((SECONDS - start)) "$R"
            sleep 0.1
        done
        cursor h
    fi
    wait "$JOB"; rc=$?; JOB=''
    if [ $rc -eq 0 ]; then
        printf '%s  %s✔%s %s %s%ss%s%s\n' "$CR" "$GRN" "$R" "$label" "$D" $((SECONDS - start)) "$R" "$EL"
    elif $soft; then
        printf '%s  %s–%s %s %s(skipped)%s%s\n' "$CR" "$YEL" "$R" "$label" "$D" "$R" "$EL"
    else
        printf '%s  %s✖%s %s%s\n\n' "$CR" "$RED" "$R" "$label" "$EL"
        tail -n 25 "$LOG" | sed 's/^/    /'
        printf '\n  %sLog lengkap: %s%s\n' "$D" "$LOG" "$R"
        exit 1
    fi
}

# choose "question" option... : arrow keys / j k / number, Enter to pick. Sets CHOICE (0-based).
choose() {
    local q=$1; shift
    local opts=("$@") n=$# sel=0 key i label hint
    printf '  %s?%s %s%s%s %s(↑↓ to move · Enter to select)%s\n' "$GRN" "$R" "$B" "$q" "$R" "$D" "$R"
    cursor l
    while :; do
        for i in "${!opts[@]}"; do
            label=${opts[i]%%|*}; hint=''
            [[ "${opts[i]}" == *"|"* ]] && hint=${opts[i]#*|}
            [ "$i" -eq 0 ] && hint="${hint:+$hint · }default"
            if [ "$i" -eq "$sel" ]; then printf '\e[K    %s❯ %-34s%s %s%s%s\n' "$CYN$B" "$label" "$R" "$D" "$hint" "$R"
            else printf '\e[K      %s%-34s %s%s\n' "$D" "$label" "$hint" "$R"; fi
        done
        IFS= read -rsn1 key
        [ "$key" = $'\e' ] && { IFS= read -rsn2 -t 0.05 key || true; }
        case "$key" in
            '[A'|OA|k) sel=$(( (sel - 1 + n) % n )) ;;
            '[B'|OB|j) sel=$(( (sel + 1) % n )) ;;
            [1-9]) [ "$key" -le "$n" ] && sel=$((key - 1)) ;;
            '') break ;;
        esac
        printf '\e[%dA' "$n"
    done
    printf '\e[%dA\e[J' $((n + 1))
    printf '  %s✔%s %s%s%s %s%s%s\n' "$GRN" "$R" "$B" "$q" "$R" "$CYN" "${opts[sel]%%|*}" "$R"
    cursor h
    CHOICE=$sel
}

# ask "question" default : free text, Enter keeps default. Sets ANSWER.
ask() {
    printf '  %s?%s %s%s%s %s(%s)%s ' "$GRN" "$R" "$B" "$1" "$R" "$D" "$2" "$R"
    IFS= read -r ANSWER
    ANSWER=${ANSWER:-$2}
    printf '\e[1A\e[K  %s✔%s %s%s%s %s%s%s\n' "$GRN" "$R" "$B" "$1" "$R" "$CYN" "$ANSWER" "$R"
}

# One list for --help and the parameter block shown on every run: "flag|description"
PARAMS=(
    "--version <V>|Use a specific version (also --version=<V>)"
    "--use-current|Reuse the latest version in $CHANGELOG: re-tag & rebuild without bumping"
    "--no-build|Changelog, commit, tag & git push only, no docker"
    "--dry-run|Show the plan without running anything"
    "-y, --yes|No questions or confirmation (default: patch +1, with build)"
    "-h, --help|Show this help"
)

# print_params [active-flag...] : active flags get a ✔ marker
print_params() {
    local p flag mark
    for p in "${PARAMS[@]}"; do
        flag=${p%%|*}; mark=' '
        for a in "$@"; do [[ "$flag" == *"$a"* ]] && mark="${GRN}✔${R}"; done
        printf '    %s %s%-15s%s %s%s%s\n' "$mark" "$CYN" "$flag" "$R" "$D" "${p#*|}" "$R"
    done
}

usage() {
    cat <<EOF
${B}deploy.sh${R} - changelog, git tag, build & push ${IMAGE##*/}

${B}Usage${R}
  ./deploy.sh                    Interactive: pick version & build, then confirm
  ./deploy.sh --dry-run          Same, but only shows the plan
  ./deploy.sh [options] -y       No questions at all

In a terminal, deploy.sh only asks about what no parameter has decided yet
(--version / --use-current decide the version, --no-build decides the build).

${B}Parameters${R}
EOF
    print_params
    printf '\nWithout --version / --use-current, the last patch number is bumped by 1.\n'
}

# ---------- args ----------
VERSION='' USE_CURRENT=false BUILD=true BUILD_SET=false DRY_RUN=false YES=false

while [ $# -gt 0 ]; do
    case "$1" in
        --version=*)   VERSION=${1#*=}; shift ;;
        --version)     [ -n "${2:-}" ] && [ "${2#-}" = "$2" ] || die "--version needs a value"; VERSION=$2; shift 2 ;;
        --use-current) USE_CURRENT=true; shift ;;
        --no-build)    BUILD=false; BUILD_SET=true; shift ;;
        --dry-run)     DRY_RUN=true; shift ;;
        -y|--yes)      YES=true; shift ;;
        -h|--help)     usage; exit 0 ;;
        *)             usage >&2; echo >&2; die "Unknown option: $1" ;;
    esac
done
ACTIVE=()
[ -n "$VERSION" ] && ACTIVE+=(--version)
$USE_CURRENT && ACTIVE+=(--use-current)
$BUILD_SET && ACTIVE+=(--no-build)
$DRY_RUN && ACTIVE+=(--dry-run)
$YES && ACTIVE+=(--yes)
[ -n "$VERSION" ] && $USE_CURRENT && die "--version and --use-current cannot be used together"
[ -z "$VERSION" ] || [[ "$VERSION" =~ ^[0-9A-Za-z][0-9A-Za-z._-]*$ ]] || die "Invalid version: $VERSION"

# ---------- changelog helpers ----------
current_version() { [ -f "$CHANGELOG" ] && head -n 1 "$CHANGELOG" | tr -d '\r'; }

# Tag the new entry's commits start from: the version below $1 when $1 already has an entry, else the top one.
changelog_base() {
    if tr -d '\r' <"$CHANGELOG" | grep -q "^$1\$"; then
        tr -d '\r' <"$CHANGELOG" | grep -m 2 "$VERSION_RE" | tail -n 1
    else
        current_version
    fi
}

changelog_entries() {
    git log --pretty=format:"    - %s" "${1:+$1..}HEAD" |
        grep -v -e 'auto-changelogs' -e 'update-changelogs' -e 'Merge remote-tracking' \
                -e 'build-unrelated:' -e 'unrelated-build:' -e 'Revert'
}

write_changelog() {
    local base kept line
    base=$(changelog_base "$VERSION")
    kept=$(mktemp)
    tr -d '\r' <"$CHANGELOG" >"$kept"
    if grep -q "^$VERSION\$" "$kept"; then
        line=$(grep -n -m 2 "$VERSION_RE" "$kept" | tail -n 1 | cut -d: -f1)
        tail -n +"$line" "$kept" >"$kept.2" && mv "$kept.2" "$kept"
    fi
    if [ -n "$(git rev-list "${base:+$base..}HEAD")" ]; then
        { echo "$VERSION"; changelog_entries "$base"; cat "$kept"; } >"$CHANGELOG"
    fi
    rm -f "$kept"
}

commit_changelog() { git add -A && git commit -m "auto-changelogs: $VERSION"; }
push_remote()      { git push "$1" && git push "$1" --tags; }

# ---------- preflight ----------
DEPLOY_START=$SECONDS
REPO=$(basename "$(git rev-parse --show-toplevel 2>/dev/null)") || die "Not a git repository"
BRANCH=$(git rev-parse --abbrev-ref HEAD)
HEAD_SHA=$(git rev-parse --short HEAD)
CURRENT=$(current_version)
cur=${CURRENT:-0.0.1}
NEXT="${cur%.*}.$(( ${cur##*.} + 1 ))"

bar() { printf '  %s┃%s %s\n' "$CYN" "$R" "$*"; }
echo
bar "${B}${CYN}◆ deploy${R}  ${B}${REPO}${R}"
bar "$ABOUT"
bar "${D}changelog → git tag → push git → docker build → push image${R}"
bar
bar "${D}branch${R} $BRANCH   ${D}HEAD${R} $HEAD_SHA   ${D}version${R} ${CURRENT:-none yet}"

section "Available parameters" "Pass them directly, e.g. ./deploy.sh --use-current -y  (✔ = active now)"
print_params ${ACTIVE[@]+"${ACTIVE[@]}"}

section "Checks" "Deploys only run from committed work."

if [ -n "$(git status --porcelain)" ]; then
    if $DRY_RUN; then
        warn "Working tree is not clean (ignored because of --dry-run)"
    else
        printf '  %s✖ Working tree is not clean. Commit or stash these changes first:%s\n' "$RED" "$R" >&2
        git status --short | sed 's/^/      /' >&2
        exit 1
    fi
else
    ok "Working tree is clean"
fi

# ---------- choose ----------
# Interactive: ask only for what no flag already decided. --yes or no terminal: no questions.
ASK_VERSION=false ASK_BUILD=false
if $TTY && ! $YES; then
    [ -z "$VERSION" ] && ! $USE_CURRENT && ASK_VERSION=true
    $BUILD_SET || ASK_BUILD=true
fi
if $ASK_VERSION || $ASK_BUILD; then
    section "Options" "Choose the release version and whether to build the docker image."
fi
if $ASK_VERSION; then
    choose "Version" \
        "New version $NEXT (patch +1)" \
        "Reuse current ${CURRENT:-0.0.1} (rebuild)|--use-current" \
        "Other version...|--version <V>"
    case $CHOICE in
        0) VERSION=$NEXT ;;
        1) USE_CURRENT=true ;;
        2) while :; do
               ask "Version" "$NEXT"
               [[ "$ANSWER" =~ ^[0-9A-Za-z][0-9A-Za-z._-]*$ ]] && break
               warn "Invalid version: $ANSWER"
           done
           VERSION=$ANSWER ;;
    esac
fi
if $ASK_BUILD; then
    choose "Docker image" "Build & push :latest + :version" "Skip, changelog & git only|--no-build"
    [ "$CHOICE" -eq 1 ] && BUILD=false
fi

if $USE_CURRENT; then
    [ -n "$CURRENT" ] || die "No version in $CHANGELOG yet for --use-current"
    VERSION=$CURRENT
fi
VERSION=${VERSION:-$NEXT}

# ---------- summary ----------
BASE=$(changelog_base "$VERSION")
ENTRIES=$(changelog_entries "$BASE")
COUNT=$(printf '%s' "$ENTRIES" | grep -c . || true)

section "Summary" "Review it first, nothing changes until you confirm."
if [ "$VERSION" = "$CURRENT" ]; then label="$VERSION ${D}(reusing the current version)${R}"
else label="${CURRENT:-–} → ${B}$VERSION${R}"; fi
printf '    %-10s %s\n' "Version" "$label"
git rev-parse -q --verify "refs/tags/$VERSION" >/dev/null && \
    printf '    %-10s %s\n' "" "${YEL}tag $VERSION already exists and will be recreated${R}"
printf '    %-10s %s\n' "Remote" "${REMOTES[*]}"
if $BUILD; then
    printf '    %-10s %s\n' "Image" "${IMAGE##*/}:latest"
    printf '    %-10s %s\n' "" "${IMAGE##*/}:$VERSION"
else
    printf '    %-10s %s\n' "Image" "${D}skipped${R}"
fi
CMD="./deploy.sh"
if $USE_CURRENT; then CMD+=" --use-current"; elif [ "$VERSION" != "$NEXT" ]; then CMD+=" --version $VERSION"; fi
$BUILD || CMD+=" --no-build"
printf '    %-10s %s\n' "Command" "${CYN}$CMD -y${R} ${D}(rerun without questions)${R}"
printf '    %-10s %s commits since %s\n' "Changelog" "$COUNT" "${BASE:-the start}"
if [ "$COUNT" -gt 0 ]; then
    printf '%s\n' "$ENTRIES" | head -n 8 | sed "s/^    - /      ${D}•${R} /"
    [ "$COUNT" -gt 8 ] && printf '      %s… +%d more%s\n' "$D" $((COUNT - 8)) "$R"
fi

if ! $YES && ! $DRY_RUN; then
    if $TTY; then
        echo
        choose "Continue with the deploy?" "Yes, deploy now" "Cancel"
        [ "$CHOICE" -eq 0 ] || { printf '  %sCancelled, nothing was changed.%s\n' "$D" "$R"; exit 0; }
    else
        die "Not an interactive terminal: add --yes to deploy without confirmation"
    fi
fi

# ---------- git ----------
section "Changelog & git" "Record new commits in $CHANGELOG, recreate tag $VERSION, then push to ${REMOTES[*]}."
if $DRY_RUN; then
    printf '  %s○ Write %s  (dry-run)%s\n' "$D" "$CHANGELOG" "$R"
else
    write_changelog
    ok "$CHANGELOG updated"
fi
run --soft "Delete local tag $VERSION" git tag --delete "$VERSION"
for r in "${REMOTES[@]}"; do
    run --soft "Delete tag $VERSION on $r" git push "$r" --delete "$VERSION"
done
if $DRY_RUN || [ -n "$(git status --porcelain)" ]; then
    run "Commit auto-changelogs: $VERSION" commit_changelog
else
    printf '  %s–%s Commit %s(no changelog changes)%s\n' "$YEL" "$R" "$D" "$R"
fi
run "Create tag $VERSION" git tag "$VERSION"
for r in "${REMOTES[@]}"; do
    run "Push branch & tags to $r" push_remote "$r"
done

# ---------- docker ----------
if $BUILD; then
    section "Docker" "$BUILD_DESC"
    pre_build
    run "Build ${IMAGE##*/}:latest" docker build -t "$IMAGE:latest" .
    run "Tag :$VERSION" docker tag "$IMAGE:latest" "$IMAGE:$VERSION"
    run "Push :latest" docker push "$IMAGE:latest"
    run "Push :$VERSION" docker push "$IMAGE:$VERSION"
fi

# ---------- done ----------
total=$((SECONDS - DEPLOY_START))
if $DRY_RUN; then
    section "Done" "Dry-run: nothing was run. Run without --dry-run to deploy."
    echo
    exit 0
fi
if $BUILD; then
    section "Done" "Version $VERSION is tagged & pushed, and the image is ready to pull from the registry."
else
    section "Done" "Version $VERSION is tagged & pushed to git (no image build)."
fi
printf '  %s✔ Deploy %s succeeded%s %s(%dm %02ds)%s\n' "$B$GRN" "$VERSION" "$R" "$D" $((total / 60)) $((total % 60)) "$R"
$BUILD && printf '  %s→%s Run locally (qris-web-merchant-api): %sdocker compose -f docker-compose.local.yaml pull && docker compose -f docker-compose.local.yaml up -d%s\n' "$CYN" "$R" "$B" "$R"
printf '  %s→ Log: %s%s\n\n' "$D" "$LOG" "$R"
