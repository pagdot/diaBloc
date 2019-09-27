import { off } from "codemirror";

function signedMax(base: number, max : number) {
   return Math.abs(base) < Math.abs(max) ? base : Math.sign(base) === Math.sign(max) ? max : -max;
}

export enum ClassType {
   Offset,
   Position,
   Size2d,
   BaseNode,
   Block,
   PortPosition,
   OffsetPortPosition,
   AnglePortPosition,
   Segment,
   Net,
   Data,
   Attribute
}

interface Base {
   classType : ClassType;
}

export enum Edge {
   None = "none",
   North = "north",
   East = "east",
   South = "south",
   West = "west"
}

export enum SegmentType {
   Horizontal = "-",
   Vertical = "|",
   Direct = "/"
}

export enum OffsetType {
   Absolut = 'absolut',
   Relative = 'relative'   //TODO: Rename to something better?
}

export class Offset implements Base {
   classType = ClassType.Offset;
   constructor (val : number = 0, type : OffsetType = OffsetType.Absolut) {
      this.value = val;
      this.type = type;
   }
   type : OffsetType = OffsetType.Relative;
   value : number = 0;
   get(max : number) : number {
      return this.type == OffsetType.Absolut ? signedMax(this.value, max) : max * this.value;
   }
}

export interface Position {
   x : number;
   y : number;
}

export interface Size2d {
   w : number;
   h : number;
}

export abstract class BaseNode implements Base, Position {
   classType = ClassType.BaseNode;
   name: string;
   constructor (name : string, x : number, y : number) {
      this.name = name;
      this.x = x;
      this.y = y;
   }

   x: number;
   y: number;
   getCenter() : Position {
      return this;
   };
}

export class Block extends BaseNode implements Size2d {
   classType = ClassType.Block;

   constructor (name : string, x : number, y : number, w : number, h : number) {
      super(name, x, y);

      this.w = w;
      this.h = h;
   }

   w: number;
   h: number;
   getCenter() {
      let c : Position;
      c.x = this.x + this.w/2;
      c.y = this.y + this.h/2;
      return c;
   }
}

export abstract class PortPosition implements Base {
   classType = ClassType.PortPosition;
   constructor (node : string) {
      this.node = node;
   }
   node: string;
}

export class OffsetPortPosition extends PortPosition {
   classType = ClassType.OffsetPortPosition;

   constructor (node : string, edge : Edge = Edge.None, offset : Offset = new Offset) {
      super(node);
      this.edge = edge;
      this.offset = offset;
   }
   edge: Edge = Edge.None;
   offset: Offset;
}

export class AnglePortPosition extends PortPosition {
   classType = ClassType.AnglePortPosition;

   constructor (node : string, angle : number) {
      super(node);
      this.angle = angle;
   }
   angle: number;
}

export class Segment implements Base {
   classType = ClassType.Segment;
   type: SegmentType;
   minLength: number;
   maxLength: number;
   length: number;
}

export class Net implements Base {
   classType = ClassType.Net;

   constructor (start : PortPosition, end : PortPosition, segments : Segment[]) {
      this.start = start;
      this.end = end;
      this.segments = segments;
   }
   start: PortPosition;
   end: PortPosition;

   segments: Segment[];
}

export class Data implements Base {
   classType = ClassType.Data;
   nodes: Block[];
   nets: Net[];
}

export class Attribute {
   classType = ClassType.Attribute;

   constructor (name : string, value : string = "") {
      this.name = name;
      this.value = value;
   }
   name: string;
   value: string;
}