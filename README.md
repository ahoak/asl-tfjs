# asl-tfjs

## Start Project
- remove any existing model files from /asset folder and replace with custom model
- run `yarn`
- run `yarn dev`

## Predictions
Expects input to model to be hand landmarks from mediapipe hands. See function #onResults in src/models/handPose.js. Returns sign based on index, Indexed values are found in src/constants.js which may not match new models. 

