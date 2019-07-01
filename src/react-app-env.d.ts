/// <reference types="react-scripts" />

import { GraphQLSchema } from "graphql";

declare module "@emotion/styled/macro" {
  import styled from "@emotion/styled";
  export * from "@emotion/core";
  export default styled;
}

namespace CodeMirror {
  interface LintOptions {
    schema: GraphQLSchema;
  }
  interface EditorConfiguration {
    hintOptions?: { schema: GraphQLSchema };
  }

  class EditorFromTextArea extends CodeMirror.Editor {
    showHint(input: any): void;
  }
}

declare module "relay-compiler" {
  interface GraphQLCompilerContext {}
}
