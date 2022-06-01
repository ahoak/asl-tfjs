# asl-tfjs

## About
This project is a series of experiments to use Tensorflow.js to detect American Sign Language fingerspelling using the webcam. In this project, we test both client-side and server-side models using various approaches. First, we try building a CNN using Tensorflow and converting it to a .json model to use in the webapp. Another approach we tried, is to use pre-built mediapipe [hands model](https://google.github.io/mediapipe/solutions/hands.html) to obtain hand landmarks and use for training model client-side.  

This project was part of a deep-dive into Machine Learning in Javascript presented at SeattleJS Meetup on May 11th: https://twitter.com/seattlejs/status/1521583596405858304
In the talk we covered the ML tooling ecosystem in JavaScript, TensorflowJS performance, Client-Side ML, and ML impact on web standards
![seattlejs_ml](https://user-images.githubusercontent.com/21273003/171471639-b1b8b1af-b3f4-44d1-828a-483df6438589.jpg)
