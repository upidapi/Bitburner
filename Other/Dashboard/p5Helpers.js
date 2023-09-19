/** @param {NS} ns */
export async function setupTail(ns, pID) {
	// if you whant a cheaper script replace all the "document" width "doc" 
	// and comment out the next line

	// doc = eval("document")

	// warning this totaly hijacs the tail window

	ns.disableLog("ALL")
	ns.clearLog()
    ns.closeTail()
	ns.tail()

	let tailWindow = document.getElementById(`tailWindow${pID}`)

	let tailDiv

	if (tailWindow) {
		tailDiv = document.getElementById(`tailDiv${pID}`)

	} else {
		let probeElem

		const probe = React.createElement(ProbeComp, { pID });
		ns.printRaw(probe)

		while (!probeElem) {
			probeElem = document.getElementById(`probeElm${pID}`)

			await ns.sleep(0)
		}

		tailDiv = probeElem.parentElement.parentElement.parentElement
		tailDiv.id = `tailDiv${pID}`

		tailWindow = tailDiv.parentElement
		tailWindow.id = `tailWidow${pID}`
	}

	let newTailDiv = document.createElement("div")

	newTailDiv.style.backgroundColor = "black"
	newTailDiv.style.padding = "0 0"
	newTailDiv.style.display = "flex"
	newTailDiv.style.height = "calc(100% - 33px)"

	tailWindow.replaceChild(newTailDiv, tailDiv)

	return newTailDiv
}

/** @param {NS} ns */
export async function test(ns, pID) {
	// doc = eval("document")

	// ns.disableLog("ALL")
	// ns.clearLog()
	// ns.closeTail()
	// ns.tail()

	const tailDiv = await setupTail(ns, pID)

	const testP = tailDiv.appendChild(document.createElement("h1"))
	testP.textContent = "hello"
	testP.style.color = "red"
	testP.style.width = "100%"
	testP.style.height = "100%"

	while (true) {
		await ns.sleep(0)
	}
}

export async function getP5(ns, pID) {
	let myP5;

	ns.atExit(() => {
		if (myP5) myP5.remove();
	});

	const p5JS = await fetch("https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.6.0/p5.min.js");
	const p5JSText = await p5JS.text();
	eval(p5JSText);

	const tailDiv = await setupTail(ns, pID)

	myP5 = new p5((ref) => {
		ref.setup = () => {
			const canvas = ref.createCanvas(0, 0);
			canvas.parent(tailDiv);
			canvas.id(`canvas${pID}`);

			ref.fitCanvas()

		}

		ref.fitCanvas = () => {
			// fits the canvas into the parent div

			const cWidth = ref.width
			const cHeight = ref.height

			const nWidth = tailDiv.offsetWidth
			const nHeight = tailDiv.offsetHeight

			if (cWidth != nWidth || cHeight != nHeight) {
				ref.resizeCanvas(nWidth, nHeight)
				// ref.resizeCanvas(100, nHeight)
			}
		}

		ref.draw = () => { }
	});

	return myP5
}

class ProbeComp extends React.Component {
	// probes the document for the tail window
	constructor(props) {
		super(props);
	}

	render() {
		return React.createElement('div',
			{
				id: `probeElm${this.props.pID}`
			},
			"");
	}
}