import React from 'react';
import { motion, TargetAndTransition } from 'framer-motion';

const animations: Record<string, TargetAndTransition> = {
  "_2137_3846_div_project_thumb": {
    "filter": [
      "",
      "blur(8px)",
      "blur(0px)"
    ],
    "transition": {
      "filter": {
        "type": "keyframes",
        "ease": [
          [
            0,
            0,
            1,
            1
          ],
          [
            0,
            0,
            1,
            1
          ]
        ],
        "times": [
          0,
          0,
          1
        ],
        "duration": 0.513
      },
      "backdropFilter": {
        "type": "keyframes",
        "ease": [
          [
            0,
            0,
            1,
            1
          ],
          [
            0,
            0,
            1,
            1
          ]
        ],
        "times": [
          0,
          0,
          1
        ],
        "duration": 0.513
      },
      "boxShadow": {
        "type": "keyframes",
        "ease": [
          [
            0,
            0,
            1,
            1
          ],
          [
            0,
            0,
            1,
            1
          ]
        ],
        "times": [
          0,
          0,
          1
        ],
        "duration": 0.513
      }
    },
    "backdropFilter": [
      "",
      "",
      ""
    ],
    "boxShadow": [
      "",
      "",
      ""
    ]
  }
}

export function App() {
  return (
    <>
      <motion.div id="_2137_3846_div_project_thumb" animate={animations._2137_3846_div_project_thumb} />
    </>
  )
}
