const windowsDecoder = new TextDecoder();

interface SubtitleBlock {
  timestamp: number;
  timestampString: string;
  lines: string[];
}

/**
 * This function gets a timestamp and formats it to date
 */
function formatTimestampToDateNumber(timestamp: string) {
  let [hoursString, minutesString, secondsAndMilliString] =
    timestamp.split(":");
  let [secondsString, milliString] = secondsAndMilliString.split(",");

  // Make them all values I can use on a Date
  let [hours, minutes, seconds, milli] = [
    hoursString,
    minutesString,
    secondsString,
    milliString,
  ].map((s) => parseInt(s));

  return new Date(1970, 0, 1, hours, minutes, seconds, milli).getTime();
}

/**
 * Converts an `ArrayBuffer` and returns an utf-8 string that represents a .vtt
 * subtitle.
 *
 * @param subArrayBuffer
 */
export function srtToVtt(subArrayBuffer: ArrayBuffer): string {
  let decodedText = windowsDecoder.decode(subArrayBuffer);

  let subLines = decodedText.split("\r\n");

  let subtitleBlocks: SubtitleBlock[] = [];

  /**
   * A block has the following structure
   *
   * (index) is going to be removed
   * (timestamp) identifiable by a "-->""
   * (lines) these are the subtitles
   * (end) this is just a "\n", indicating the end of a block
   */

  let currentBlock: SubtitleBlock | null = null;
  subLines.forEach((line) => {
    // This is the start of a block and this line is a timestamp
    if (line.includes("-->") && !currentBlock) {
      currentBlock = {
        timestamp: 0,
        timestampString: line,
        lines: [],
      };

      return;
    }

    // Then this should be the lines of the block
    if (line !== "" && currentBlock) {
      currentBlock.lines.push(line);
    }

    if (line === "" && currentBlock) {
      subtitleBlocks.push({ ...currentBlock });
      currentBlock = null;
    }
  });

  // Do some sanitizing, replacing "," from timestamps and getting
  // their absolute times for ordering
  subtitleBlocks = subtitleBlocks.map((block) => ({
    ...block,
    timestamp: formatTimestampToDateNumber(block.timestampString),
    timestampString: block.timestampString.replaceAll(",", "."),
  }));

  // Order them, in case there are any subtitles out of order
  let subtitleBlocksOrdered = subtitleBlocks.sort(
    (blockA, blockB) => blockA.timestamp - blockB.timestamp
  );

  // Join all the blocks in a VTT string
  let vtt = subtitleBlocksOrdered
    .map((block) => `${block.timestampString}\r\n${block.lines.join("\r\n")}`)
    .join("\r\n\r\n");

  // Make the subtitle start with WEBVTT
  vtt = `WEBVTT\r\n\r\n${vtt}`;

  return vtt;
}
