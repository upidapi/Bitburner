/** @param {NS} ns */
export async function main(ns) {
  doc = globalThis["document"]

  //const g = greeting("test");
  ns.disableLog("ALL");
  ns.clearLog();
  ns.print("test")
  let x = 0
  const g = greeting(x);
  console.log(g.props);
  g.style = "wdith:100%;height:100%";
  ns.printRaw(g);
  ns.print("a")
  while (true) {
    if (g.props.countUpB) g.props.countUpB();
    await ns.sleep(0);
  }
}

function greeting(name) {
  return React.createElement(
    TestComp,
    { className: 'greeting', toWhat: 0 }
  );
}

class TestComp extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      counter: this.props.toWhat,
    };
  }

  componentDidMount() {
    this.props.countUpB = this.countUp.bind(this);
  }

  countUp() {
    this.setState((state, props) => ({
      counter: state.counter + 1,
    }));
  }

  render() {
    return React.createElement('h1', null, `Hello ${this.state.counter}`);
  }
}