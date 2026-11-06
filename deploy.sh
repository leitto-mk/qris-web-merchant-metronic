#!/usr/bin/env bash
# Versioning, changelog, git tag, then docker build & push (:latest + :<version>).
# Local steps run first and pushes last, so a failure can be rolled back.
# Run ./deploy.sh --help for options. In a terminal it asks for anything no option decided.
set -u

# ---------- per-repo config ----------
IMAGE="container.banksulutgo.co.id:5000/web-merchant-fe"
REMOTES=(origin personal)
ABOUT="QRIS Web Merchant front-end portal · React 19 + Vite, served by nginx"
BUILD_DESC="Build the React app into an nginx image tagged :latest and the version."
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
trap '[ -n "$JOB" ] && kill "$JOB" 2>/dev/null; JOB=""; cursor h; printf "\n  %s✖ Cancelled%s\n" "$RED" "$R"; rollback; exit 130' INT

die()  { printf '  %s✖ %s%s\n' "$RED" "$*" "$R" >&2; exit 1; }
ok()   { printf '  %s✔%s %s\n' "$GRN" "$R" "$*"; }
warn() { printf '  %s!%s %s\n' "$YEL" "$R" "$*"; }
# section "Title" ["description"]
section() {
    printf '\n  %s▍%s %s%s%s\n' "$MAG" "$R" "$B" "$1" "$R"
    [ -n "${2:-}" ] && printf '  %s  %s%s\n' "$D" "$2" "$R"
    return 0
}

# ---------- rollback ----------
# Each step that changes something registers how to undo itself; on failure they run newest first.
UNDO=() ROLLING=false SOFT_MSG=skipped
undo() { local s; printf -v s '%q ' "$@"; UNDO+=("$s"); }
rollback() {
    $ROLLING && return 0
    ROLLING=true SOFT_MSG="failed, fix it by hand"
    if [ ${#UNDO[@]} -eq 0 ]; then
        printf '\n  %sNothing was changed, so there is nothing to roll back.%s\n' "$D" "$R"; return 0
    fi
    section "Rollback" "A step failed, so everything done so far is undone in reverse order."
    local i
    for ((i = ${#UNDO[@]} - 1; i >= 0; i--)); do eval "${UNDO[i]}"; done
    UNDO=()
}

# run [--soft] "label" cmd... : spinner while cmd runs, output goes to $LOG.
# --soft: a failure is reported but does not stop or roll back the deploy.
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
        printf '%s  %s–%s %s %s(%s)%s%s\n' "$CR" "$YEL" "$R" "$label" "$D" "$SOFT_MSG" "$R" "$EL"
        return 1
    else
        printf '%s  %s✖%s %s%s\n\n' "$CR" "$RED" "$R" "$label" "$EL"
        tail -n 25 "$LOG" | sed 's/^/    /'
        rollback
        printf '\n  %s✖ Deploy failed at: %s%s\n' "$RED" "$label" "$R"
        printf '  %s→ Full log: %s%s\n\n' "$D" "$LOG" "$R"
        exit 1
    fi
}

# choose "question" option... : arrow keys / j k / number, Enter to pick. Sets CHOICE (0-based).
# An option may carry a hint after "|", shown dimmed (e.g. the matching parameter).
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
    "--build-only|Build & push the image only (current version), no changelog or git"
    "--dry-run|Show the plan without running anything"
    "-y, --yes|No questions or confirmation (default: patch +1, full release)"
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
  ./deploy.sh                    Interactive: pick what to deploy & the version, then confirm
  ./deploy.sh --dry-run          Same, but only shows the plan
  ./deploy.sh [options] -y       No questions at all

In a terminal, deploy.sh only asks about what no parameter has decided yet
(--no-build / --build-only decide what to deploy, --version / --use-current the version).
If a step fails, everything done before it is rolled back.

${B}Parameters${R}
EOF
    print_params
    printf '\nWithout --version / --use-current, the last patch number is bumped by 1\n(--build-only uses the current version instead).\n'
}

# ---------- args ----------
VERSION='' USE_CURRENT=false MODE='' DRY_RUN=false YES=false

while [ $# -gt 0 ]; do
    case "$1" in
        --version=*)   VERSION=${1#*=}; shift ;;
        --version)     [ -n "${2:-}" ] && [ "${2#-}" = "$2" ] || die "--version needs a value"; VERSION=$2; shift 2 ;;
        --use-current) USE_CURRENT=true; shift ;;
        --no-build)    [ "$MODE" = image ] && die "--no-build and --build-only cannot be used together"; MODE=git; shift ;;
        --build-only)  [ "$MODE" = git ] && die "--no-build and --build-only cannot be used together"; MODE=image; shift ;;
        --dry-run)     DRY_RUN=true; shift ;;
        -y|--yes)      YES=true; shift ;;
        -h|--help)     usage; exit 0 ;;
        *)             usage >&2; echo >&2; die "Unknown option: $1" ;;
    esac
done
ACTIVE=()
[ -n "$VERSION" ] && ACTIVE+=(--version)
$USE_CURRENT && ACTIVE+=(--use-current)
[ "$MODE" = git ] && ACTIVE+=(--no-build)
[ "$MODE" = image ] && ACTIVE+=(--build-only)
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

# Remote state before publishing, so a failed deploy can put it back: "<branch sha>\n<tag sha>"
snapshot_remote() {
    local out
    out=$(git ls-remote "$1" "refs/heads/$BRANCH" "refs/tags/$VERSION") || return 1
    { printf '%s\n' "$out" | awk -v r="refs/heads/$BRANCH" '$2==r {print $1}'
      printf '%s\n' "$out" | awk -v r="refs/tags/$VERSION" '$2==r {print $1}'; } >"$SNAP.$1"
}
# restore_ref remote ref old-sha expected-sha : put a remote ref back (delete it if it did not exist)
restore_ref() {
    if [ -n "$3" ]; then git push --force-with-lease="$2:$4" "$1" "$3:$2"
    else git push "$1" --delete "$2"; fi
}
# restore_image tag old-id : point a local image tag back (remove it if it did not exist)
restore_image() {
    if [ -n "$2" ]; then docker tag "$2" "$IMAGE:$1"; else docker rmi "$IMAGE:$1"; fi
}

# ---------- preflight ----------
DEPLOY_START=$SECONDS
REPO=$(basename "$(git rev-parse --show-toplevel 2>/dev/null)") || die "Not a git repository"
BRANCH=$(git rev-parse --abbrev-ref HEAD)
HEAD_SHA=$(git rev-parse --short HEAD)
CURRENT=$(current_version)
cur=${CURRENT:-0.0.1}
NEXT="${cur%.*}.$(( ${cur##*.} + 1 ))"
SNAP=$(mktemp)

bar() { printf '  %s┃%s %s\n' "$CYN" "$R" "$*"; }
echo
bar "${B}${CYN}◆ deploy${R}  ${B}${REPO}${R}"
bar "$ABOUT"
bar "${D}changelog → commit & tag → docker build → push git → push image${R}"
bar
bar "${D}branch${R} $BRANCH   ${D}HEAD${R} $HEAD_SHA   ${D}version${R} ${CURRENT:-none yet}"

section "Available parameters" "Pass them directly, e.g. ./deploy.sh --use-current -y  (✔ = active now)"
print_params ${ACTIVE[@]+"${ACTIVE[@]}"}

section "Checks" "Deploys only run from committed work, which also makes a clean rollback possible."
[ "$BRANCH" = HEAD ] && die "Detached HEAD: check out a branch first"
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
ASK_MODE=false ASK_VERSION=false
if $TTY && ! $YES; then
    [ -z "$MODE" ] && ASK_MODE=true
    [ -z "$VERSION" ] && ! $USE_CURRENT && ASK_VERSION=true
fi
if $ASK_MODE || $ASK_VERSION; then
    section "Options" "Choose what to deploy and which version."
fi
if $ASK_MODE; then
    choose "Deploy" \
        "Full release (git + image)" \
        "Git only, no image|--no-build" \
        "Image only, no git|--build-only"
    MODE=$(echo full git image | cut -d' ' -f$((CHOICE + 1)))
fi
MODE=${MODE:-full}
if $ASK_VERSION; then
    if [ "$MODE" = image ]; then
        choose "Version" "Current ${CURRENT:-0.0.1}" "Other version...|--version <V>"
        [ "$CHOICE" -eq 0 ] && USE_CURRENT=true
    else
        choose "Version" \
            "New version $NEXT (patch +1)" \
            "Reuse current ${CURRENT:-0.0.1} (rebuild)|--use-current" \
            "Other version...|--version <V>"
        case $CHOICE in 0) VERSION=$NEXT ;; 1) USE_CURRENT=true ;; esac
    fi
    if [ -z "$VERSION" ] && ! $USE_CURRENT; then
        while :; do
            ask "Version" "$([ "$MODE" = image ] && echo "${CURRENT:-$NEXT}" || echo "$NEXT")"
            [[ "$ANSWER" =~ ^[0-9A-Za-z][0-9A-Za-z._-]*$ ]] && break
            warn "Invalid version: $ANSWER"
        done
        VERSION=$ANSWER
    fi
fi

GIT=true BUILD=true
[ "$MODE" = git ] && BUILD=false
[ "$MODE" = image ] && GIT=false
if $USE_CURRENT || { [ "$MODE" = image ] && [ -z "$VERSION" ]; }; then
    [ -n "$CURRENT" ] || die "No version in $CHANGELOG yet: pass --version"
    VERSION=$CURRENT
fi
VERSION=${VERSION:-$NEXT}

# ---------- summary ----------
section "Summary" "Review it first, nothing changes until you confirm."
case $MODE in
    full)  printf '    %-10s %s\n' "Deploy" "Full release ${D}(changelog, git tag & push, image build & push)${R}" ;;
    git)   printf '    %-10s %s\n' "Deploy" "Git only ${D}(no image)${R}" ;;
    image) printf '    %-10s %s\n' "Deploy" "Image only ${D}(no changelog or git changes)${R}" ;;
esac
if [ "$VERSION" = "$CURRENT" ]; then label="$VERSION ${D}(current version)${R}"
else label="${CURRENT:-–} → ${B}$VERSION${R}"; fi
printf '    %-10s %s\n' "Version" "$label"
TAG_AT=$(git rev-parse -q --verify "refs/tags/$VERSION^{commit}" 2>/dev/null || true)
if $GIT && [ -n "$TAG_AT" ]; then
    printf '    %-10s %s\n' "" "${YEL}tag $VERSION already exists and will be moved to the new commit${R}"
elif ! $GIT && [ "$TAG_AT" != "$(git rev-parse HEAD)" ]; then
    printf '    %-10s %s\n' "" "${YEL}HEAD is not tagged $VERSION: the image is built from ${HEAD_SHA}${R}"
fi
$GIT && printf '    %-10s %s\n' "Remote" "${REMOTES[*]}"
if $BUILD; then
    printf '    %-10s %s\n' "Image" "${IMAGE##*/}:$VERSION"
    printf '    %-10s %s\n' "" "${IMAGE##*/}:latest"
fi
CMD="./deploy.sh"
[ "$MODE" = git ] && CMD+=" --no-build"
[ "$MODE" = image ] && CMD+=" --build-only"
if [ "$MODE" = image ]; then [ "$VERSION" != "$CURRENT" ] && CMD+=" --version $VERSION"
elif $USE_CURRENT; then CMD+=" --use-current"
elif [ "$VERSION" != "$NEXT" ]; then CMD+=" --version $VERSION"; fi
printf '    %-10s %s\n' "Command" "${CYN}$CMD -y${R} ${D}(rerun without questions)${R}"
if $GIT; then
    BASE=$(changelog_base "$VERSION")
    ENTRIES=$(changelog_entries "$BASE")
    COUNT=$(printf '%s' "$ENTRIES" | grep -c . || true)
    printf '    %-10s %s commits since %s\n' "Changelog" "$COUNT" "${BASE:-the start}"
    if [ "$COUNT" -gt 0 ]; then
        printf '%s\n' "$ENTRIES" | head -n 8 | sed "s/^    - /      ${D}•${R} /"
        [ "$COUNT" -gt 8 ] && printf '      %s… +%d more%s\n' "$D" $((COUNT - 8)) "$R"
    fi
fi
printf '    %-10s %s\n' "Rollback" "${D}any failure undoes the steps before it; an image tag already in the registry stays${R}"

if ! $YES && ! $DRY_RUN; then
    if $TTY; then
        echo
        choose "Continue with the deploy?" "Yes, deploy now" "Cancel"
        [ "$CHOICE" -eq 0 ] || { printf '  %sCancelled, nothing was changed.%s\n' "$D" "$R"; exit 0; }
    else
        die "Not an interactive terminal: add --yes to deploy without confirmation"
    fi
fi

# ---------- local: changelog, commit, tag ----------
ORIG_SHA=$(git rev-parse HEAD)
OLD_TAG=$(git rev-parse -q --verify "refs/tags/$VERSION" 2>/dev/null || true)
if $GIT; then
    section "Changelog & tag" "Local only: record new commits in $CHANGELOG, commit, and tag $VERSION."
    undo run --soft "Reset $CHANGELOG & HEAD to ${ORIG_SHA:0:7}" git reset -q --hard "$ORIG_SHA"
    if $DRY_RUN; then
        printf '  %s○ Write %s  (dry-run)%s\n' "$D" "$CHANGELOG" "$R"
    else
        write_changelog
        ok "$CHANGELOG updated"
    fi
    if $DRY_RUN || [ -n "$(git status --porcelain)" ]; then
        run "Commit auto-changelogs: $VERSION" commit_changelog
    else
        printf '  %s–%s Commit %s(no changelog changes)%s\n' "$YEL" "$R" "$D" "$R"
    fi
    if [ -n "$OLD_TAG" ]; then undo run --soft "Restore local tag $VERSION" git update-ref "refs/tags/$VERSION" "$OLD_TAG"
    else undo run --soft "Delete local tag $VERSION" git tag --delete "$VERSION"; fi
    run "Tag $VERSION" git tag -f "$VERSION"
fi
NEW_SHA=$(git rev-parse HEAD)

# ---------- local: docker build ----------
if $BUILD; then
    section "Docker build" "Local only: $BUILD_DESC"
    pre_build
    if ! $DRY_RUN; then
        OLD_LATEST=$(docker image inspect -f '{{.Id}}' "$IMAGE:latest" 2>/dev/null || true)
        OLD_VER=$(docker image inspect -f '{{.Id}}' "$IMAGE:$VERSION" 2>/dev/null || true)
    fi
    run "Build ${IMAGE##*/}:latest" docker build -t "$IMAGE:latest" .
    undo run --soft "Restore local image :latest" restore_image latest "${OLD_LATEST:-}"
    run "Tag :$VERSION" docker tag "$IMAGE:latest" "$IMAGE:$VERSION"
    undo run --soft "Restore local image :$VERSION" restore_image "$VERSION" "${OLD_VER:-}"
fi

# ---------- publish ----------
case $MODE in
    full)  section "Publish" "Git remotes first (can be rolled back), then the registry: :$VERSION, and :latest last." ;;
    git)   section "Publish" "Push the branch and tag $VERSION to ${REMOTES[*]} (rolled back if one fails)." ;;
    image) section "Publish" "Push to the registry: :$VERSION first, :latest last so it only moves when everything worked." ;;
esac
if $GIT; then
    for r in "${REMOTES[@]}"; do
        run "Check $r" snapshot_remote "$r"
    done
    for r in "${REMOTES[@]}"; do
        old_branch='' old_tag=''
        if ! $DRY_RUN; then old_branch=$(sed -n 1p "$SNAP.$r"); old_tag=$(sed -n 2p "$SNAP.$r"); fi
        run "Push $BRANCH to $r" git push "$r" "HEAD:refs/heads/$BRANCH"
        undo run --soft "Restore $BRANCH on $r" restore_ref "$r" "refs/heads/$BRANCH" "$old_branch" "$NEW_SHA"
        run "Push tag $VERSION to $r" git push --force "$r" "refs/tags/$VERSION"
        undo run --soft "Restore tag $VERSION on $r" restore_ref "$r" "refs/tags/$VERSION" "$old_tag" "$(git rev-parse "refs/tags/$VERSION" 2>/dev/null)"
    done
fi
if $BUILD; then
    run "Push :$VERSION" docker push "$IMAGE:$VERSION"
    undo warn "Registry keeps ${IMAGE##*/}:$VERSION (registry tags cannot be rolled back); :latest is unchanged"
    run "Push :latest" docker push "$IMAGE:latest"
fi
UNDO=()
rm -f "$SNAP" "$SNAP".*

# ---------- done ----------
total=$((SECONDS - DEPLOY_START))
if $DRY_RUN; then
    section "Done" "Dry-run: nothing was run. Run without --dry-run to deploy."
    echo
    exit 0
fi
case $MODE in
    full)  section "Done" "Version $VERSION is tagged & pushed, and the image is ready to pull from the registry." ;;
    git)   section "Done" "Version $VERSION is tagged & pushed to git (no image build)." ;;
    image) section "Done" "Image :$VERSION and :latest are pushed (no git changes)." ;;
esac
printf '  %s✔ Deploy %s succeeded%s %s(%dm %02ds)%s\n' "$B$GRN" "$VERSION" "$R" "$D" $((total / 60)) $((total % 60)) "$R"
$BUILD && printf '  %s→%s Run locally (qris-web-merchant-api): %sdocker compose -f docker-compose.local.yaml pull && docker compose -f docker-compose.local.yaml up -d%s\n' "$CYN" "$R" "$B" "$R"
printf '  %s→ Log: %s%s\n\n' "$D" "$LOG" "$R"
