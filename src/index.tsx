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

// @ts-ignore
import { GraphQLCompilerContext } from "relay-compiler";
// @ts-ignore
import InlineFragmentsTransform from "relay-compiler/lib/InlineFragmentsTransform";
// @ts-ignore
import SkipRedundantNodesTransform from "relay-compiler/lib/SkipRedundantNodesTransform";
// @ts-ignore
import RelayApplyFragmentArgumentTransform from "relay-compiler/lib/RelayApplyFragmentArgumentTransform";
// @ts-ignore
import FlattenTransform from "relay-compiler/lib/FlattenTransform";
// @ts-ignore
import RelayParser from "relay-compiler/lib/RelayParser";
// @ts-ignore
import GraphQLIRPrinter from "relay-compiler/lib/GraphQLIRPrinter";
import { buildSchema, parse, GraphQLSchema } from "graphql";

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

const AppContainer = styled.div`
  display: flex;
  height: calc(100vh - ${headerHeight});
  width: 100vw;
  color: ${sideBarTextColor};
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
`;

const Content = styled.div`
  height: 100%;
  width: 100%;
  justify-content: stretch;
  overflow: hidden;
  display: flex;
  flex-direction: row;
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
  width: 100%;
  flex: 1 0 0;
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const ResultContent = styled.div`
  flex: 1 0 0;
`;

const App: React.FC<{}> = () => {
  const [schemaText, setSchemaText] = useState(rawSchema);
  const [operationText, setOperationText] = useState(defaultOperation);
  const [optimizedOperationText, setOptimizedOperationText] = useState("");
  const [schema, setSchema] = useState<null | GraphQLSchema>(null);
  const [availableTransforms, setAvailableTransforms] = useState([
    {
      title: `RelayApplyFragmentArgumentTransform`,
      active: true,
      transform: () => RelayApplyFragmentArgumentTransform.transform
    },

    {
      title: `InlineFragmentsTransform`,
      active: true,
      transform: () => InlineFragmentsTransform.transform
    },
    {
      title: `FlattenTransform`,
      active: true,
      transform: () =>
        FlattenTransform.transformWithOptions({ flattenAbstractTypes: true })
    },

    {
      title: `SkipRedundantNodesTransform`,
      active: true,
      transform: () => SkipRedundantNodesTransform.transform
    }
  ]);

  useEffect(() => {
    let schema: null | GraphQLSchema = null;
    let optimizedQueryResult: null | string = null;
    try {
      schema = buildSchema(schemaText);
      const relayDocuments = RelayParser.transform(
        schema,
        parse(operationText).definitions
      );

      const documents = new GraphQLCompilerContext(schema)
        .addAll(relayDocuments)
        .applyTransforms(
          availableTransforms.filter(t => t.active).map(t => t.transform())
        )
        .documents();

      optimizedQueryResult = documents
        .map((doc: unknown) => GraphQLIRPrinter.print(doc))
        .join(`\n`);
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
  }, [
    schemaText,
    operationText,
    availableTransforms,
    setOptimizedOperationText,
    setSchema
  ]);

  return (
    <>
      <Header>
        <RelayLogo /> <Heading>Relay Compiler REPL</Heading>
        <HeaderSide>
          <div style={{ marginLeft: 16 }}>
            Built with ❤️by{" "}
            <a href="https://github.com/n1ru4l" style={{ fontWeight: "bold" }}>
              @n1ru4l
            </a>
          </div>
        </HeaderSide>
      </Header>
      <AppContainer>
        <Global styles={globalStyles} />
        <Sidebar>
          <TransformList>
            <TransformListHeader>Active Transforms</TransformListHeader>
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
    </>
  );
};

render(<App />, root);
