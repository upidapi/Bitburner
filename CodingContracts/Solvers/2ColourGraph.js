function colourNode(nodeNum, nodes) {
    let node = nodes[nodeNum]

    if (node.colour != null) {
        return nodes
    }

    let colour = null
    for (let connectionNum of node.connections) {
        let connection = nodes[connectionNum]

        if (connection.colour == null) {
            continue
        }

        if (colour == null) {
            colour = connection.colour
            continue
        }

        if (colour != connection.colour) {
            // not possible
            return false
        }

        colour = connection.colour
    }

    if (colour == null) {
        node.colour = 0
    } else if (colour == 0) {
        node.colour = 1
    } else if (colour == 1) {
        node.colour = 0
    }

    // colour adjacent nodes
    for (let connectionNum of node.connections) {
        nodes = colourNode(connectionNum, nodes)

        if (nodes == false) {
            return false
        }
    }

    return nodes
}

export function colourNodes(data) {
    let nNodes = data[0]
    let edges = data[1]

    let nodes = []
    for (let i = 0; i < nNodes; i++) {
        nodes.push({
            "connections": [],
            "colour": null,
        })
    }

    for (let edge of edges) {
        nodes[edge[0]].connections.push(edge[1])
        nodes[edge[1]].connections.push(edge[0])
    }

    for (let nodeNum = 0; nodeNum < nNodes; nodeNum++) {
        nodes = colourNode(nodeNum, nodes)

        if (nodes == false) {
            return []
        }
    }

    let out = nodes.map(val => val.colour)

    return out
}