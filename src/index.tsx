import "./shim";
import React, { useState, useEffect } from "react";
import { render } from "react-dom";
import { Global } from "@emotion/core";
import styled from "@emotion/styled/macro";
import css from "@emotion/css/macro";
import {
  SchemaArea,
  OperationArea,
  ResultArea,
  rawSchema,
  defaultOperation
} from "./codemirror";

import InlineFragmentsTransform from "relay-compiler/lib/transforms/InlineFragmentsTransform";
import SkipRedundantNodesTransform from "relay-compiler/lib/transforms/SkipRedundantNodesTransform";
import ApplyFragmentArgumentTransform from "relay-compiler/lib/transforms/ApplyFragmentArgumentTransform";
import FlattenTransform from "relay-compiler/lib/transforms/FlattenTransform";
import { commonTransforms, queryTransforms, printTransforms, schemaExtensions, codegenTransforms } from "relay-compiler/lib/core/RelayIRTransforms";
import {
  Parser as RelayParser,
  Printer as GraphQLIRPrinter,
  LocalArgumentDefinition,
  CompilerContext,
  transformASTSchema
} from "relay-compiler";
import { create as createSchema } from "relay-compiler/lib/core/Schema";
import ASTConvert from "relay-compiler/lib/core/ASTConvert";

import {
  buildSchema,
  parse,
  GraphQLSchema,
  GraphQLType,
  isNonNullType,
  isListType
} from "graphql";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Could not find Application root container.");
}

const sideBarTextColor = "black";
const htmlBackgroundColor = "#f7f7f7";
const headerHeight = "50px";
const headerBackgroundColor = "#f26b00";

const RelayLogo: React.FC<{
  size?: number;
  width?: number;
  height?: number;
}> = ({ size = 40, width = size, height = size, ...props }) => (
  <svg viewBox="0 0 525 525" width={width} height={height} {...props}>
    <g fill="#FFF">
      <path d="M105.536 161.858c0 26.36-21.368 47.72-47.72 47.72-26.36 0-47.722-21.36-47.722-47.72s21.36-47.72 47.72-47.72c26.355 0 47.722 21.36 47.722 47.72" />
      <path d="M201.124 377.225c-35.25 0-63.926-28.674-63.926-63.923s28.678-63.926 63.926-63.926h120.78c20.816 0 37.753-16.938 37.753-37.756s-16.938-37.756-37.753-37.756H57.81c-7.227 0-13.086-5.86-13.086-13.085 0-7.227 5.86-13.086 13.085-13.086h264.093c35.25 0 63.923 28.678 63.923 63.926 0 35.248-28.674 63.923-63.923 63.923h-120.78c-20.82 0-37.756 16.938-37.756 37.76 0 20.816 16.938 37.753 37.756 37.753H468.18c7.227 0 13.086 5.86 13.086 13.085 0 7.226-5.858 13.085-13.085 13.085H201.124z" />
      <path d="M420.464 364.142c0-26.36 21.36-47.72 47.72-47.72s47.72 21.36 47.72 47.72-21.36 47.72-47.72 47.72-47.72-21.36-47.72-47.72" />
    </g>
  </svg>
);

const GithubIcon = () => (
  <svg
    width={16}
    height={16}
    viewBox={"0 0 24 24"}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

const globalStyles = css`
  * {
    box-sizing: border-box;
  }

  html,
  body {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
      Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
  }

  html {
    background-color: ${htmlBackgroundColor};
  }

  a {
    text-decoration: none;
    color: white;
  }
`;

const Container = styled.div`
  min-width: 1080px;
`;

const AppContainer = styled.div`
  display: flex;
  height: calc(100vh - ${headerHeight});
  width: 100vw;
  color: ${sideBarTextColor};
  width: 100%;
`;

const Header = styled.div`
  width: 100%;
  height: ${headerHeight};
  background-color: ${headerBackgroundColor};
  display: flex;
  align-items: center;
  padding: 0 16px;
  color: white;
`;

const Heading = styled.div`
  color: white;
  margin-left: 16px;
  font-weight: bold;
`;

const HeaderSide = styled.div`
  margin-left: auto;
  margin-right: 0;
  display: flex;
`;

const Sidebar = styled.div`
  flex: 0 0 auto;
  border-right: 1px solid #d3d3d3;
  display: flex;
  flex-direction: column;
`;

const Content = styled.div`
  height: 100%;
  width: 100%;
  justify-content: stretch;
  overflow: hidden;
  display: flex;
  flex-direction: row;
  overflow: auto;
`;

const TransformListHeader = styled.div`
  height: 50px;
  font-weight: bold;
  padding: 16px 8px;
`;

const TransformList = styled.div`
  list-style: none;
  padding: 0;
`;

const transformListItemHoverColor = `#d1d1d1`;
const TransformListItem = styled.label`
  display: block;
  padding: 8px 8px;
  cursor: pointer;

  &:hover {
    background-color: ${transformListItemHoverColor};
  }
`;

const CheckboxInput = styled.input`
  margin-right: 8px;
`;

const EditableContent = styled.div`
  flex: 0 0 50%;
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 50%;
`;

const ResultContent = styled.div`
  flex: 0 0 50%;
  width: 50%;
`;

const HeaderAuthor = styled.div`
  margin-left: 16px;
  display: flex;
  align-items: center;
`;

const HeaderAuthorLink = styled.a`
  margin-left: 4px;
  font-weight: bold;
`;

const ForkLinkContainer = styled.div`
  margin-top: auto;
  padding: 16px;
`;

const ForkLink = styled.a`
  color: black;
  display: flex;
  font-weight: bold;
`;

const ForkLinkText = styled.span`
  margin-left: 8px;
`;

const createInitialAvailableTransformsState = () => [
  {
    title: `ApplyFragmentArgumentTransform`,
    active: true,
    transform: () => ApplyFragmentArgumentTransform.transform
  },
  {
    title: `InlineFragmentsTransform`,
    active: true,
    transform: () => InlineFragmentsTransform.transform
  },
  {
    title: `FlattenTransform`,
    active: true,
    transform: () => FlattenTransform.transformWithOptions({})
  },
  {
    title: `SkipRedundantNodesTransform`,
    active: true,
    transform: () => SkipRedundantNodesTransform.transform
  }
];

const App: React.FC<{}> = () => {
  const [schemaText, setSchemaText] = useState(rawSchema);
  const [operationText, setOperationText] = useState(defaultOperation);
  const [optimizedOperationText, setOptimizedOperationText] = useState("");
  const [schema, setSchema] = useState<null | GraphQLSchema>(null);

  const [availableTransforms, setAvailableTransforms] = useState(
    createInitialAvailableTransformsState
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      let schema: null | GraphQLSchema = null;
      let optimizedQueryResult: null | string = null;
      try {
        schema = buildSchema(schemaText);
        const relaySchema = createSchema(schemaText, [], schemaExtensions);

        if ((schema == null) || (relaySchema == null)) {
          throw new Error('Missing schema!');
        }

        const inputDocuments = [parse(operationText)];
        const relayDocuments = ASTConvert.convertASTDocuments(
          relaySchema,
          inputDocuments,
          RelayParser.transform,
        );

        const argumentDefinitions = relayDocuments.reduce(
          (result: Readonly<LocalArgumentDefinition[]>, doc) => {
            return [
              ...result,
              ...((doc.argumentDefinitions || []) as LocalArgumentDefinition[])
            ];
          },
          []
        );

        const compilerContext = new CompilerContext(relaySchema).addAll(relayDocuments)
        const outputDocuments = compilerContext
          .applyTransforms(
            [
              ...commonTransforms,
              ...queryTransforms,
              ...printTransforms,
              ...availableTransforms.filter(t => t.active).map(t => t.transform())
            ]
          )
          .documents();

        optimizedQueryResult = outputDocuments
          .map(doc => GraphQLIRPrinter.print(relaySchema, doc))
          .join(`\n`);

        schema = transformASTSchema(schema, schemaExtensions);
      } catch (err) {
        console.error(err);
      } finally {
        if (optimizedQueryResult) {
          setOptimizedOperationText(optimizedQueryResult);
        }
        if (schema) {
          setSchema(schema);
        }
      }
    }, 200);

    return () => clearTimeout(timeout);
  }, [
    schemaText,
    operationText,
    availableTransforms,
    setOptimizedOperationText,
    setSchema
  ]);

  return (
    <Container>
      <Header>
        <RelayLogo /> <Heading>Relay Compiler REPL</Heading>
        <HeaderSide>
          <HeaderAuthor>
            Built with{" "}
            <span role="img" aria-label="love" style={{ paddingLeft: 5 }}>
              ❤️
            </span>
            by{" "}
            <HeaderAuthorLink href="https://github.com/n1ru4l">
              @n1ru4l
            </HeaderAuthorLink>
          </HeaderAuthor>
        </HeaderSide>
      </Header>
      <AppContainer>
        <Global styles={globalStyles} />
        <Sidebar>
          <TransformList>
            <TransformListHeader>Available Transforms</TransformListHeader>
            {availableTransforms.map(transform => (
              <TransformListItem key={transform.title}>
                <CheckboxInput
                  type="checkbox"
                  checked={transform.active}
                  onChange={() => {
                    setAvailableTransforms(availableTransforms => [
                      ...availableTransforms.map(_transform => {
                        if (_transform.title !== transform.title) {
                          return _transform;
                        }

                        return {
                          ..._transform,
                          active: !_transform.active
                        };
                      })
                    ]);
                  }}
                />
                {transform.title}
              </TransformListItem>
            ))}
          </TransformList>
          <ForkLinkContainer>
            <ForkLink href="https://github.com/n1ru4l/relay-compiler-repl">
              <GithubIcon />
              <ForkLinkText>Fork me on Github</ForkLinkText>
            </ForkLink>
          </ForkLinkContainer>
        </Sidebar>
        <Content>
          <EditableContent>
            <SchemaArea onChangeSchema={setSchemaText} />
            <OperationArea
              onChangeOperation={setOperationText}
              schema={schema}
            />
          </EditableContent>
          <ResultContent>
            <ResultArea result={optimizedOperationText} />
          </ResultContent>
        </Content>
      </AppContainer>
    </Container>
  );
};

render(<App />, root);
