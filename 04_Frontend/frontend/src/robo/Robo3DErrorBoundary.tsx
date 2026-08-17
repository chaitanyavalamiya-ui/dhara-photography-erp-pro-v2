import { Component, type ReactNode } from 'react';
import { RoboFallbackImage } from './RoboFallbackImage';

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
}

export class Robo3DErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return <RoboFallbackImage />;
    }
    return this.props.children;
  }
}
