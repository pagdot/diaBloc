import * as CodeMirror from 'codemirror';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/addon/edit/matchbrackets';
import 'codemirror/addon/edit/closebrackets';
import 'codemirror/addon/lint/lint';
import 'codemirror/addon/fold/foldgutter';
import 'codemirror/addon/fold/brace-fold';
import * as Blocks from './classes';
import * as Decoders from './decoders';
import 'codemirror/lib/codemirror.css';
import 'codemirror/addon/fold/foldgutter.css';
import * as example from './example.diaBloc';

let editor : CodeMirror.Editor;

function getEdgePosition(node: Blocks.Block, edge : Blocks.Edge, offset : Blocks.Offset = new Blocks.Offset) : Blocks.Position {
   let pos : Blocks.Position = {
      x: node.x + node.w/2,
      y: node.y + node.h/2
   };

   if (edge == Blocks.Edge.East) {
      pos.x = node.x + node.w;
      pos.y += offset.get(node.h/2);
   } else if (edge == Blocks.Edge.West) {
      pos.x = node.x;
      pos.y += offset.get(node.h/2);;
   }

   if (edge == Blocks.Edge.North) {
      pos.y = node.y;
      pos.x += offset.get(node.h/2);
   } else if (edge == Blocks.Edge.South) {
      pos.y = node.y + node.h;
      pos.x += offset.get(node.h/2);
   }
   return pos;
}

function calcAngleOffset(node : Blocks.Block, angle : number) : Blocks.Position {
   let rad = angle * Math.PI / 180;
   let yoffset : number      = node.w/2 * Math.tan(rad);
   let yedge   : Blocks.Edge = Math.cos(rad) > 0 ? Blocks.Edge.East : Blocks.Edge.West;
   let xoffset : number      = node.h/2 * Math.tan(Math.PI/2-rad);
   let xedge   : Blocks.Edge = Math.sin(rad) > 0 ? Blocks.Edge.North : Blocks.Edge.South;

   if (Math.abs(yoffset) < node.h/2) {
      return getEdgePosition(node, yedge, new Blocks.Offset(yedge === Blocks.Edge.East ? -yoffset : yoffset));
   } else {
      return getEdgePosition(node, xedge, new Blocks.Offset(xedge === Blocks.Edge.South ? -xoffset : xoffset));
   }
}

function createSvgNode(type: string, attributes: Blocks.Attribute[]) : SVGElement {
   const xmlns = "http://www.w3.org/2000/svg";
   let node : SVGElement = document.createElementNS(xmlns, type);
   for (let a in attributes) {
      node.setAttribute(attributes[a].name, attributes[a].value);
   }
   return node;
}

function createRect(x: number, y: number, w: number, h: number) : SVGElement {
   let attributes : Blocks.Attribute[] = [
      new Blocks.Attribute('x', x.toString()),
      new Blocks.Attribute('y', y.toString()),
      new Blocks.Attribute('width', w.toString()),
      new Blocks.Attribute('height', h.toString()),
      new Blocks.Attribute('style', 'fill:white;stroke:black;stroke-width:1')
   ];
   return createSvgNode('rect', attributes);
}

function createLine(start: Blocks.Position, end: Blocks.Position) : SVGElement {
   let attributes : Blocks.Attribute[] = [
      new Blocks.Attribute('x1', start.x.toString()),
      new Blocks.Attribute('y1', start.y.toString()),
      new Blocks.Attribute('x2', end.x.toString()),
      new Blocks.Attribute('y2', end.y.toString()),
      new Blocks.Attribute('style', 'stroke:black;stroke-width:1')
   ];
   return createSvgNode('line', attributes);
}

function createNet(net: Blocks.Net, nodes: Blocks.Block[]) : SVGElement[] {
   let node_start = nodes.filter(n => n.name == net.start.node)[0];
   let node_end = nodes.filter(n => n.name == net.end.node)[0];
   let segments : SVGElement[] = [];
   let start : Blocks.Position;
   let end : Blocks.Position;

   if (!node_start) {
      throw "Can't find node \"" + net.start.node + "\""
   }

   if (!node_end) {
      throw "Can't find node \"" + net.end.node + "\""
   }

   if (net.start.classType == Blocks.ClassType.AnglePortPosition) {
      start = calcAngleOffset(node_start, (net.start as Blocks.AnglePortPosition).angle);
   } else if (net.start.classType == Blocks.ClassType.OffsetPortPosition) {
      let s = net.start as Blocks.OffsetPortPosition;
      start = getEdgePosition(node_start, s.edge || Blocks.Edge.None, s.offset)
   } else {
      throw "Invalid type for PortPosition: " + net.start.classType;
   }

   if (net.end.classType == Blocks.ClassType.AnglePortPosition) {
      end = calcAngleOffset(node_end, (net.end as Blocks.AnglePortPosition).angle);
   } else if (net.end.classType == Blocks.ClassType.OffsetPortPosition) {
      let e = net.end as Blocks.OffsetPortPosition;
      end = getEdgePosition(node_end, e.edge || Blocks.Edge.None, e.offset)
   } else {
      throw "Invalid type for PortPosition: " + net.end.classType;
   }

   let vSegs = 0, hSegs = 0;

   if (!(start && end)) {
      throw "Missing start or end element for net: " + JSON.stringify(net);
   }

   if (net.segments) {
      for (let seg of net.segments) {
         switch (seg.type) {
            case Blocks.SegmentType.Horizontal:
               hSegs++;
               break;
            
            case Blocks.SegmentType.Vertical:
               vSegs++;
               break;

            case Blocks.SegmentType.Direct:
               hSegs++;
               vSegs++;
               break;
         }
      }

      let pos = start;
      let hSeg = hSegs > 0 ? (end.x - start.x) / hSegs : 0;
      let vSeg = vSegs > 0 ? (end.y - start.y) / vSegs : 0;

      for (let seg of net.segments) {
         let nextPos = JSON.parse(JSON.stringify(pos)); //FIXME: create copy
         switch (seg.type) {
            case Blocks.SegmentType.Horizontal:
               nextPos.x += hSeg;
               break;
            
            case Blocks.SegmentType.Vertical:
               nextPos.y += vSeg;
               break;

            case Blocks.SegmentType.Direct:
               nextPos.x += hSeg;
               nextPos.y += vSeg;
               break;
         }
         segments.push(createLine(pos, nextPos));
         pos = nextPos;
      }

      if (Math.abs(pos.x - end.x) > 0.1 || Math.abs(pos.y - end.y) > 0.1) {
         throw "Can't reach end position! Current Pos: " + pos.x + "," + pos.y + " End Pos: " + end.x + "," + end.y;
      }
   } else {
      segments.push(createLine(start, end));
   }

   return segments;
}

function createNodes(nodes: Blocks.Block[]) : SVGElement[] {
   let _nodes : SVGElement[] = [];
   if (nodes) {
      for (let i in nodes) {
         _nodes.push(createRect(nodes[i].x, nodes[i].y, nodes[i].w, nodes[i].h));
      }
   }
   return _nodes;
}

function createNets(nets: Blocks.Net[], nodes: Blocks.Block[]) : SVGElement[] {
   let _nets : SVGElement[] = [];
   if (nets) {
      for (let i in nets) {
         let n = createNet(nets[i], nodes);
         _nets = _nets.concat(n);
      }
   }
   return _nets;
}

function createDiagram(data: Blocks.Data) : SVGElement[] {
   let elems : SVGElement[] = [];
   if (data.nodes) {
      if (data.nets) {
         elems = elems.concat(createNets(data.nets, data.nodes))
      }

      elems = elems.concat(createNodes(data.nodes));
   }
   return elems;
}

function draw(context : HTMLElement, elems : SVGElement[]) {
   while (context.hasChildNodes()) context.lastChild.remove();
   for (let e in elems) {
      context.appendChild(elems[e]);
   }
}

function updatePreview() {
   let raw = editor.getValue();
   let log = document.getElementById("errorlog");
   if (!/^\s*$/.test(raw)) {
      try {
         let data : Blocks.Data = Decoders.decodeData(JSON.parse(editor.getValue()));
         let diagram : SVGElement[] = createDiagram(data);

         let context = document.getElementById('preview') as HTMLElement;
         draw(context, diagram);
         log.innerHTML = "";
      } catch (error) {
         if (typeof error == "object") {
            if (error instanceof SyntaxError) {
               log.innerHTML = (error as SyntaxError).message;
            } else {
               log.innerHTML = JSON.stringify(error);
            }
         } else {
            log.innerHTML = error.toString();
         }
         console.log(error);
         return;
      }
   }
}

function init() {
   let delay: NodeJS.Timeout;
   editor = CodeMirror.fromTextArea(document.getElementById('code') as HTMLTextAreaElement, {
      mode: 'application/json',
      lineNumbers: true,
      autoCloseBrackets: true,
      matchBrackets: true,
      foldGutter: true,
      gutters: ["CodeMirror-lint-markers", "CodeMirror-foldgutter"],
      lint: true
   });
   editor.setValue(example.default);

   editor.on("change", function() {
      clearTimeout(delay);
      delay = setTimeout(updatePreview, 300);
   });
   setTimeout(updatePreview, 300);
}

if (document.readyState === "complete") {
   init();
} else {
   document.onreadystatechange = () => {if (document.readyState == "complete") init();};
}