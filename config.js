import { classes } from "./constants";

/**
 * @typedef {Function} TypeFnGetFileSource
 * @param {string} letterclass
 * @param {number} index
 * @returns {string | string[] | undefined}
 */

/**
 * @typedef {Function} TypeFnGetFolderSource
 * @param {string} letterclass
 * @param {number} index
 * @returns {string | undefined}
 */

/**
 * Declare our returned type
 *
 * @typedef {Object} SourceDataObj
 * @property {string} testPath
 * @property {TypeFnGetSource | undefined} file
 *  @property {TypeFnGetFolderSource  | undefined} folder
 */

/**
 * Declare our returned type
 *
 * @typedef {Object} Config
 * @property {SourceDataObj} images
 * @property {SourceDataObj} videos
 * @property {string[]} classes
 * @property {boolean | undefined} useCV
 * @property {boolean | undefined} logOutput
 * @property {string | undefined} dataset
 */

/** @type {TypeFnGetSource} getImage */
/*  return image file or array of image files*/
const getImage = (letterclass /*: string*/, index /*: string*/) => {
  return `${letterclass}_test.jpg`;
};

/** @type {TypeFnGetSource} getVideo */
/*  return image file or array of image files*/
const getVideo = (letterclass /*: string*/, index /*: string*/) => {
  if (letterclass === "A") {
    return "output.mkv";
  }
};

/** @type {Config} Config */
export const config = {
  images: {
    testPath: undefined,
    file: getImage,
    folder: undefined,
  },
  videos: {
    testPath: undefined,
    file: getVideo,
    folder: undefined,
  },
  classes,
  useCV: false,
  logOutput: true,
  dataset: undefined,
};
