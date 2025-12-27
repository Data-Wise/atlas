#!/bin/bash
#
# Atlas CLI Installer
# https://github.com/Data-Wise/atlas
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/Data-Wise/atlas/main/install.sh | bash
#
# Options:
#   ATLAS_VERSION=v0.5.3  - Install specific version (default: latest)
#   ATLAS_DIR=~/.atlas    - Installation directory (default: ~/.local/share/atlas)
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO="Data-Wise/atlas"
INSTALL_DIR="${ATLAS_DIR:-$HOME/.local/share/atlas}"
BIN_DIR="${HOME}/.local/bin"

info() { echo -e "${BLUE}==>${NC} $1"; }
success() { echo -e "${GREEN}==>${NC} $1"; }
warn() { echo -e "${YELLOW}==>${NC} $1"; }
error() { echo -e "${RED}==>${NC} $1" >&2; exit 1; }

# Check dependencies
check_deps() {
    info "Checking dependencies..."

    if ! command -v node &> /dev/null; then
        error "Node.js is required but not installed. Install from https://nodejs.org/"
    fi

    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        error "Node.js 18+ required (found: $(node -v))"
    fi

    if ! command -v npm &> /dev/null; then
        error "npm is required but not installed."
    fi

    if ! command -v git &> /dev/null; then
        error "git is required but not installed."
    fi

    success "Dependencies OK (Node $(node -v))"
}

# Get latest version from GitHub
get_latest_version() {
    curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" 2>/dev/null | \
        grep '"tag_name"' | sed -E 's/.*"([^"]+)".*/\1/'
}

# Download and install
install_atlas() {
    local version="${ATLAS_VERSION:-$(get_latest_version)}"

    if [ -z "$version" ]; then
        version="main"
        warn "Could not detect latest version, using main branch"
    fi

    info "Installing Atlas ${version}..."

    # Create directories
    mkdir -p "$INSTALL_DIR"
    mkdir -p "$BIN_DIR"

    # Remove existing installation
    if [ -d "$INSTALL_DIR" ] && [ "$(ls -A $INSTALL_DIR 2>/dev/null)" ]; then
        warn "Removing existing installation..."
        rm -rf "$INSTALL_DIR"
        mkdir -p "$INSTALL_DIR"
    fi

    # Clone repository
    info "Downloading..."
    if [[ "$version" == "main" ]]; then
        git clone --depth 1 "https://github.com/${REPO}.git" "$INSTALL_DIR" 2>/dev/null
    else
        git clone --depth 1 --branch "$version" "https://github.com/${REPO}.git" "$INSTALL_DIR" 2>/dev/null
    fi

    # Install dependencies
    info "Installing dependencies..."
    cd "$INSTALL_DIR"
    npm install --production --silent

    # Create symlink
    info "Creating symlink..."
    ln -sf "$INSTALL_DIR/bin/atlas.js" "$BIN_DIR/atlas"
    chmod +x "$BIN_DIR/atlas"

    success "Atlas installed successfully!"
}

# Verify installation
verify_install() {
    if [ -x "$BIN_DIR/atlas" ]; then
        echo ""
        success "Installation complete!"
        echo ""
        echo "  Location: $INSTALL_DIR"
        echo "  Binary:   $BIN_DIR/atlas"
        echo ""

        # Check if bin dir is in PATH
        if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
            warn "Add $BIN_DIR to your PATH:"
            echo ""
            echo "  # Add to ~/.zshrc or ~/.bashrc:"
            echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
            echo ""
        fi

        echo "  Get started:"
        echo "    atlas init"
        echo "    atlas --help"
        echo ""
    else
        error "Installation failed. Binary not found at $BIN_DIR/atlas"
    fi
}

# Main
main() {
    echo ""
    echo "  ╔═══════════════════════════════════════╗"
    echo "  ║          Atlas CLI Installer          ║"
    echo "  ║   ADHD-Friendly Project Management    ║"
    echo "  ╚═══════════════════════════════════════╝"
    echo ""

    check_deps
    install_atlas
    verify_install
}

main "$@"
