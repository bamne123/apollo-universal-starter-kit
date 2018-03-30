import ErrorStackParser from 'error-stack-parser';
import { StackFrame } from 'error-stack-parser';
import React from 'react';
import * as sourcemapped from 'sourcemapped-stacktrace';
import settings from '../../../../settings';

const format = (fmt: string, ...args: any[]) =>
  fmt.replace(/{(\d+)}/g, (match: any, index: number) => (typeof args[index] !== 'undefined' ? args[index] : match));

interface RedBoxState {
  mapped?: boolean;
}

interface RedBoxProps {
  error?: Error;
}

export default class RedBox extends React.Component<RedBoxProps, RedBoxState> {
  public state = {
    mapped: false
  };

  constructor(props: RedBoxProps) {
    super(props);
  }

  public componentDidMount() {
    if (!this.state.mapped) {
      sourcemapped.mapStackTrace(this.props.error.stack, (mappedStack: string[]) => {
        const processStack = __DEV__
          ? fetch('/servdir')
              .then((res: any) => res.text())
              .then((servDir: string) => mappedStack.map((frame: string) => frame.replace('webpack:///', servDir)))
          : Promise.resolve(mappedStack);
        processStack.then((stack: string[]) => {
          this.props.error.stack = stack.join('\n');
          this.setState({ mapped: true });
        });
      });
    }
  }

  public renderFrames(frames: StackFrame[]) {
    const { frame, file, linkToFile } = styles;
    return frames.map((f: StackFrame, index: number) => {
      const text: string = `at ${f.fileName}:${f.lineNumber}:${f.columnNumber}`;
      const url: string = format(settings.app.stackFragmentFormat, f.fileName, f.lineNumber, f.columnNumber);

      return (
        <div style={frame} key={index}>
          <div>{f.functionName}</div>
          <div style={file}>
            <a href={url} style={linkToFile}>
              {text}
            </a>
          </div>
        </div>
      );
    });
  }

  public render() {
    const error: Error = this.props.error;

    const { redbox, message, stack, frame } = styles;

    let frames: any;
    let parseError: Error;
    try {
      if (error.message.indexOf('\n    at ') >= 0) {
        // We probably have stack in our error message
        // a trick used by our errorMiddleware to pass error stack
        // when GraphQL context creation failed, use that stack
        error.stack = error.message;
        error.message = error.stack.split('\n')[0];
      }
      frames = ErrorStackParser.parse(error);
    } catch (e) {
      parseError = new Error('Failed to parse stack trace. Stack trace information unavailable.');
    }

    if (parseError) {
      frames = (
        <div style={frame} key={0}>
          <div>{parseError.message}</div>
        </div>
      );
    } else {
      frames = this.renderFrames(frames);
    }

    return (
      <div style={redbox}>
        <div style={message}>
          {error.name}: {error.message}
        </div>
        <div style={stack}>{frames}</div>
      </div>
    );
  }
}

const styles: any = {
  redbox: {
    boxSizing: 'border-box',
    fontFamily: 'sans-serif',
    position: 'fixed',
    padding: 10,
    top: '0px',
    left: '0px',
    bottom: '0px',
    right: '0px',
    width: '100%',
    background: 'rgb(204, 0, 0)',
    color: 'white',
    zIndex: 2147483647,
    textAlign: 'left',
    fontSize: '16px',
    lineHeight: 1.2,
    overflow: 'auto'
  },
  message: {
    fontWeight: 'bold'
  },
  stack: {
    fontFamily: 'monospace',
    marginTop: '2em'
  },
  frame: {
    marginTop: '1em'
  },
  file: {
    fontSize: '0.8em',
    color: 'rgba(255, 255, 255, 0.7)'
  },
  linkToFile: {
    textDecoration: 'none',
    color: 'rgba(255, 255, 255, 0.7)'
  }
};