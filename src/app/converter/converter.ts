import * as fs from 'fs';
import * as sass from 'sass';
import * as glob from 'glob';
import { Parser, Mixins } from '../parser';
import { Utils } from '../utils';
import { IOptions, IDeclaration } from 'sass-export';

const LINE_BREAK = '\n';

/**
 * Converter class used for receiving the files and process them
 * @param {IOptions} options options parameters
 */
export class Converter {
  constructor(public options?: IOptions) {
    this.options = options || ({} as IOptions);
  }

  public getArray(): IDeclaration[] {
    let content = this.getContent();
    let parsedDeclarations = new Parser(content).parse();

    return parsedDeclarations.map(declaration => {
      if (declaration.mapValue) {
        declaration.mapValue.map(mapDeclaration => {
          mapDeclaration.compiledValue = this.renderPropertyValue(
            content,
            mapDeclaration
          );
          return mapDeclaration;
        });
        declaration.compiledValue = JSON.stringify(declaration.mapValue);
      } else {
        declaration.compiledValue = this.renderPropertyValue(
          content,
          declaration
        );
      }

      declaration.name = `$${declaration.name}`;

      return declaration;
    });
  }

  public getStructured(): any {
    let content = this.getContent();
    let structuredDeclaration = new Parser(content).parseStructured();
    structuredDeclaration = this.compileStructure(structuredDeclaration);

    return structuredDeclaration;
  }

  public compileStructure(structuredDeclaration: IDeclaration): object {
    let groups = Object.keys(structuredDeclaration);

    groups.forEach(group => {
      let content = this.getContent();

      let compiledGroup = structuredDeclaration[group].map(declaration => {
        if (declaration.mapValue) {
          declaration.mapValue.map(mapDeclaration => {
            mapDeclaration.compiledValue = this.renderPropertyValue(
              content,
              mapDeclaration
            );
          });
          declaration.compiledValue = JSON.stringify(declaration.mapValue);
        } else {
          declaration.compiledValue = this.renderPropertyValue(
            content,
            declaration
          );
        }

        declaration.name = `$${declaration.name}`;

        return declaration;
      });

      return compiledGroup;
    });

    return this.checkForMixins(structuredDeclaration);
  }

  public getContent(): string {
    let inputFiles = [];
    let inputs = [];

    if (!Array.isArray(this.options.inputFiles)) {
      inputFiles.push(this.options.inputFiles);
    } else {
      inputFiles = this.options.inputFiles;
    }

    inputFiles.forEach(path => {
      let files = glob.sync(String(path));
      inputs.push(...files);
    });

    let contents = inputs.map(filePath => fs.readFileSync(String(filePath)));

    return contents.join(LINE_BREAK);
  }

  private checkForMixins(structuredDeclaration: object) {
    let mixinsGroup = 'mixins';
    let parsedMixins = new Mixins(this.getContent()).parse();

    if (parsedMixins && parsedMixins.length) {
      structuredDeclaration[mixinsGroup] = parsedMixins;
    }

    return structuredDeclaration;
  }

  private renderPropertyValue(
    content: string,
    declaration: IDeclaration
  ): string {
    try {
      let rendered = sass.renderSync({
        data: content + LINE_BREAK + Utils.wrapCss(declaration),
        includePaths: this.options.includePaths,
      });

      let wrappedRendered = String(rendered.css);

      return Utils.unWrapValue(wrappedRendered);
    } catch (err) {
      console.error(err);
      return ''; // if the property can't be rendered, then it should return an empty string
    }
  }
}
