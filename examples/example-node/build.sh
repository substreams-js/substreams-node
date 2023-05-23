#/bin/bash

# https://nodejs.org/api/single-executable-applications.html

# Generate the blob to be injected
node --experimental-sea-config sea-config.json

# Create a copy of the node executable and name it according to your needs:
cp $(command -v node) example-node-macos

# Remove the signature of the binary (macOS and Windows only):
codesign --remove-signature example-node-macos

# Inject the blob into the copied binary by running postject with the following options:
npx postject example-node-macos NODE_SEA_BLOB out/sea-prep.blob \
    --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 \
    --macho-segment-name NODE_SEA

# Sign the binary (macOS and Windows only):
codesign --sign - example-node-macos
