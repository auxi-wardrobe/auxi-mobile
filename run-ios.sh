#!/bin/bash

# Open the iOS Simulator
echo "Launching iOS Simulator..."
open -a Simulator

# Wait a moment for the simulator to start initializing (optional but helpful)
sleep 2

# Run the iOS app using yarn
echo "Running yarn ios..."
yarn ios
