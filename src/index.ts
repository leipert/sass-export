import { Converter, ConverterBuffer } from './app/converter';
import { IOptions } from 'sass-export';

let sassExporter = (options: IOptions) => {
  return new Converter(options);
};

let bufferExporter = (input: Buffer[], options: IOptions) => {
  let converter = new ConverterBuffer(input, options);
  return converter.getData();
};

module.exports = {
  exporter: sassExporter,
  buffer: bufferExporter,
};
