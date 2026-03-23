const line = "Rank1,Name1,,Cat1,,,City1";
const regex = /(".*?"|[^",\n\r]*)(?=\s*,|\s*$)/g;
const cells = line.match(regex);
console.log(cells);
