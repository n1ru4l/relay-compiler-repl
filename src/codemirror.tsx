import "codemirror/lib/codemirror.css";
import CodeMirror from "codemirror";
import { buildSchema } from "graphql";
import stripIndent from "strip-indent";
import MD from "markdown-it";
import "codemirror/addon/hint/show-hint";
import "codemirror/addon/hint/show-hint.css";
import "codemirror/addon/comment/comment";
import "codemirror/addon/edit/matchbrackets";
import "codemirror/addon/edit/closebrackets";
import "codemirror/addon/fold/foldgutter";
import "codemirror/addon/fold/foldgutter.css";
import "codemirror/addon/fold/brace-fold";
import "codemirror/addon/search/search";
import "codemirror/addon/search/searchcursor";
import "codemirror/addon/search/jump-to-line";
import "codemirror/addon/dialog/dialog";
import "codemirror/addon/lint/lint";
import "codemirror/addon/lint/lint.css";
import "codemirror/keymap/sublime";
import "codemirror-graphql/hint";
import "codemirror-graphql/lint";
import "codemirror-graphql/info";
import "codemirror-graphql/jump";
import "codemirror-graphql/mode";

import styled from "@emotion/styled/macro";

import React, { useRef, useEffect } from "react";
const md = new MD();
export const rawSchema = stripIndent(/* GraphQL */ `
  # The query type, represents all of the entry points into our object graph
  type Query {
    hero(episode: Episode): Character
    reviews(episode: Episode!): [Review]
    search(text: String): [SearchResult]
    character(id: ID!): Character
    droid(id: ID!): Droid
    human(id: ID!): Human
    starship(id: ID!): Starship
  }
  # The mutation type, represents all updates we can make to our data
  type Mutation {
    createReview(episode: Episode, review: ReviewInput!): Review
  }
  # The subscription type, represents all subscriptions we can make to our data
  type Subscription {
    reviewAdded(episode: Episode): Review
  }
  # The episodes in the Star Wars trilogy
  enum Episode {
    # Star Wars Episode IV: A New Hope, released in 1977.
    NEWHOPE
    # Star Wars Episode V: The Empire Strikes Back, released in 1980.
    EMPIRE
    # Star Wars Episode VI: Return of the Jedi, released in 1983.
    JEDI
  }
  # A character from the Star Wars universe
  interface Character {
    # The ID of the character
    id: ID!
    # The name of the character
    name: String!
    # The friends of the character, or an empty list if they have none
    friends: [Character]
    # The friends of the character exposed as a connection with edges
    friendsConnection(first: Int, after: ID): FriendsConnection!
    # The movies this character appears in
    appearsIn: [Episode]!
  }
  # Units of height
  enum LengthUnit {
    # The standard unit around the world
    METER
    # Primarily used in the United States
    FOOT
  }
  # A humanoid creature from the Star Wars universe
  type Human implements Character {
    # The ID of the human
    id: ID!
    # What this human calls themselves
    name: String!
    # The home planet of the human, or null if unknown
    homePlanet: String
    # Height in the preferred unit, default is meters
    height(unit: LengthUnit = METER): Float
    # Mass in kilograms, or null if unknown
    mass: Float
    # This human's friends, or an empty list if they have none
    friends: [Character]
    # The friends of the human exposed as a connection with edges
    friendsConnection(first: Int, after: ID): FriendsConnection!
    # The movies this human appears in
    appearsIn: [Episode]!
    # A list of starships this person has piloted, or an empty list if none
    starships: [Starship]
  }
  # An autonomous mechanical character in the Star Wars universe
  type Droid implements Character {
    # The ID of the droid
    id: ID!
    # What others call this droid
    name: String!
    # This droid's friends, or an empty list if they have none
    friends: [Character]
    # The friends of the droid exposed as a connection with edges
    friendsConnection(first: Int, after: ID): FriendsConnection!
    # The movies this droid appears in
    appearsIn: [Episode]!
    # This droid's primary function
    primaryFunction: String
  }
  # A connection object for a character's friends
  type FriendsConnection {
    # The total number of friends
    totalCount: Int
    # The edges for each of the character's friends.
    edges: [FriendsEdge]
    # A list of the friends, as a convenience when edges are not needed.
    friends: [Character]
    # Information for paginating this connection
    pageInfo: PageInfo!
  }
  # An edge object for a character's friends
  type FriendsEdge {
    # A cursor used for pagination
    cursor: ID!
    # The character represented by this friendship edge
    node: Character
  }
  # Information for paginating this connection
  type PageInfo {
    startCursor: ID
    endCursor: ID
    hasNextPage: Boolean!
  }
  # Represents a review for a movie
  type Review {
    # The movie
    episode: Episode
    # The number of stars this review gave, 1-5
    stars: Int!
    # Comment about the movie
    commentary: String
  }
  # The input object sent when someone is creating a new review
  input ReviewInput {
    # 0-5 stars
    stars: Int!
    # Comment about the movie, optional
    commentary: String
    # Favorite color, optional
    favorite_color: ColorInput
  }
  # The input object sent when passing in a color
  input ColorInput {
    red: Int!
    green: Int!
    blue: Int!
  }
  type Starship {
    # The ID of the starship
    id: ID!
    # The name of the starship
    name: String!
    # Length of the starship, along the longest axis
    length(unit: LengthUnit = METER): Float
    coordinates: [[Float!]!]
  }
  union SearchResult = Human | Droid | Starship
`);

export const defaultOperation = stripIndent(/* GraphQL */ `
  fragment CharacterData on Character
    @argumentDefinitions(
      includeAppearsIn: { type: "Boolean", defaultValue: false }
    ) {
    id
    name
    appearsIn @include(if: $includeAppearsIn)
  }

  query UserProfile {
    hero {
      id
      ...CharacterData @arguments(includeAppearsIn: true)
      friends {
        id
        ...CharacterData @arguments(includeAppearsIn: false)
      }
    }
  }
`);

const schema = buildSchema(rawSchema);

const Textarea = styled.textarea`
  width: 100%;
  height: auto;
`;

const Container = styled.div`
  flex: 1 0 0;
  overflow: hidden;
  height: 100%;

  > .CodeMirror {
    height: calc(100% - 50px);
  }
`;

const TextareaHeader = styled.div`
  font-weight: bold;
  padding: 16px;
  height: 50px;
`;

export const SchemaArea: React.FC<{
  onChangeSchema: (str: string) => void;
}> = ({ onChangeSchema }) => {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    if (ref.current) {
      CodeMirror.fromTextArea(ref.current, {
        mode: "graphql",
        lineNumbers: true
      });
    }
  }, []);
  return (
    <Container>
      <TextareaHeader>Schema</TextareaHeader>
      <Textarea ref={ref} defaultValue={rawSchema.replace(`\n`, ``)} />
    </Container>
  );
};

export const QueryArea: React.FC<{
  onChangeOperation: (str: string) => void;
}> = ({ onChangeOperation }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (ref.current) {
      const editor = CodeMirror.fromTextArea(ref.current, {
        mode: "graphql",
        lint: {
          schema
        },
        // @ts-ignore
        hintOptions: {
          schema,
          closeOnUnfocus: false,
          completeSingle: false
        },
        info: {
          schema,
          renderDescription: (text: string) => md.render(text)
        },
        lineNumbers: true,
        tabSize: 2,
        keyMap: "sublime",
        autoCloseBrackets: true,
        matchBrackets: true,
        showCursorWhenSelecting: true,
        foldGutter: {
          minFoldSize: 4
        },
        extraKeys: {
          "Cmd-Space": () =>
            // @ts-ignore
            editor.showHint({
              completeSingle: true,
              container: containerRef.current
            }),
          "Ctrl-Space": () =>
            // @ts-ignore
            editor.showHint({
              completeSingle: true,
              container: containerRef.current
            }),
          "Alt-Space": () =>
            // @ts-ignore
            editor.showHint({
              completeSingle: true,
              container: containerRef.current
            }),
          "Shift-Space": () =>
            // @ts-ignore
            editor.showHint({
              completeSingle: true,
              container: containerRef.current
            }),
          "Shift-Alt-Space": () =>
            // @ts-ignore
            editor.showHint({
              completeSingle: true,
              container: containerRef.current
            })
        }
      });
      editor.on("change", editor => {
        onChangeOperation(editor.getValue());
      });
    }
  }, []);
  return (
    <Container ref={containerRef}>
      <TextareaHeader>Operation</TextareaHeader>
      <Textarea ref={ref} defaultValue={defaultOperation} />
    </Container>
  );
};

export const ResultArea: React.FC<{ result: string }> = ({ result }) => {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const editor = useRef<null | CodeMirror.EditorFromTextArea>(null);
  useEffect(() => {
    if (!editor.current) {
      if (ref.current) {
        editor.current = CodeMirror.fromTextArea(ref.current, {
          mode: "graphql",
          lineNumbers: true,
          readOnly: true
        });
      }
    } else {
      editor.current.setValue(result);
    }
  }, [result]);

  return (
    <Container>
      <TextareaHeader>Optimized Operation Result</TextareaHeader>
      <Textarea ref={ref} defaultValue={``} />
    </Container>
  );
};
