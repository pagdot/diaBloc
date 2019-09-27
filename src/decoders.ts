import { Offset, OffsetType, Edge, SegmentType, Segment, Block, Net, Data, OffsetPortPosition, AnglePortPosition, PortPosition } from './classes';


//matches all floating point numbers
const floatRegexp = /^\d+(?:\.\d*)?(?:e[+-]?\d+)?$/;
const floatPercentRegexp = /^\d+(?:\.\d*)?(?:e[+-]?\d+)?%$/;

function checkProperty(obj : object, prop : any, propType? : string) : boolean {
   return prop in obj && ((!propType) || typeof obj[prop as keyof typeof obj] === propType);
}

function checkPropertyArray(obj : object, prop : any) : boolean {
   return checkProperty(obj, prop, "object") && 
      obj[prop as keyof typeof obj] as object instanceof Array;
}

function requireProperty(obj : object, prop : any, target : string, propType? : string) {
   if (!checkProperty(obj, prop, propType)) {
      throw "Object missing property \"" + prop + "\" " + (propType ? "of type \"" +
         propType + "\" " : "") + "for " + target + ": " + JSON.stringify(obj);
   }
}

function requirePropertyArray(obj : object, prop : any, target : string) {
   if (!checkPropertyArray(obj, prop)) {
      throw "Object missing array property \"" + prop + "\" " + " for " + target + ": " + JSON.stringify(obj);
   }
}

function getProperty<T>(obj : object, prop : any) : T {
   return obj[prop as keyof typeof obj];
}

export function decodeEdge(value : string) {
   if (Object.values(Edge).some(x => x == value)) {
      return value as Edge;
   }
   throw "Invalid value for Edge \"" + value + "\"";
}

export function decodeSegmentType(value : string) {;
   if (Object.values(SegmentType).some(x => x == value)) {
      return value as SegmentType;
   }
   throw "Invalid value for SegmentType \"" + value + "\"";
}

export function decodeOffsetType(value : string) {
   if (Object.values(OffsetType).some(x => x == value)) {
      return value as OffsetType;
   }
   throw "Invalid value for OffsetType \"" + value + "\"";
}

export function decodeOffset(value  : number) : Offset;
export function decodeOffset(value  : string) : Offset;
export function decodeOffset(offset : object) : Offset;
export function decodeOffset(p1 : number | string | object) : Offset {
   switch (typeof p1) {
      case 'number':
         return new Offset(p1);

      case 'string':
         if (floatRegexp.test(p1)) {
            return new Offset(parseFloat(p1));
         } else if (floatPercentRegexp.test(p1)) {
            return new Offset(parseFloat(p1)/100, OffsetType.Relative);
         } else {
            throw "Invalid string for Offset \"" + p1 + "\"";
         }

      case 'object':
         requireProperty(p1, "type", "Offset", "string");
         requireProperty(p1, "value", "Offset", "number");
         return new Offset (
            getProperty(p1, "value"),
            decodeOffsetType(getProperty(p1, "type"))
         )         

      default:
         throw "Invalid type for Offset: " + typeof p1;
   }
}

export function decodePortPosition(node : string) : PortPosition;
export function decodePortPosition(endpoint : object) : PortPosition;
export function decodePortPosition(p : string | object) : PortPosition {
   switch (typeof p) {
      case 'string':
         {
            return new OffsetPortPosition(p);
         }
      case 'object':
         {
            requireProperty(p, "node", "Endpoint", "string");

            if (checkProperty(p, "edge", "string")) {
               return new OffsetPortPosition(
                  getProperty(p, "node"),
                  decodeEdge(getProperty(p, "edge")),
                  checkProperty(p, "offset") ? decodeOffset(getProperty(p, "edge")) : new Offset()
               );
            } else if (checkProperty(p, "angle")) {
               return new AnglePortPosition(
                  getProperty(p, "node"),
                  getProperty(p, "angle")
               );
            } else {
               return new OffsetPortPosition(getProperty(p, "node"));
            }
         }
      default:
         throw "Invalid type for Endpoint: " + typeof p;
   }
}

export function decodeSegment(segmentType : string) : Segment;
export function decodeSegment(segment     : object) : Segment;
export function decodeSegment(p1          : string | object) : Segment {
   let segment : Segment = new Segment();

   switch (typeof p1) {
      case 'string':
         segment.type = decodeSegmentType(p1);
         break;

      case 'object':
         requireProperty(p1, "type", "Segment", "string");
         segment.type = decodeSegmentType(getProperty(p1, "type"));

         if (checkProperty(p1, "minLength", "number")) {
            segment.minLength = getProperty(p1, "minLength");
         }

         if (checkProperty(p1, "maxLength", "number")) {
            segment.maxLength = getProperty(p1, "maxLength");
         }

         if (checkProperty(p1, "length", "number")) {
            segment.length = getProperty(p1, "length");
         }
         break;
   
      default:
         throw "Invalid type for Segment: " + typeof p1;
   }

   return segment;
}

export function decodeBlock(node : object) : Block {

   requireProperty(node, "name", "Node", "string");
   requireProperty(node, "x", "Node", "number");
   requireProperty(node, "y", "Node", "number");
   requireProperty(node, "w", "Node", "number");
   requireProperty(node, "h", "Node", "number");

   return new Block(
      getProperty(node, "name"),
      getProperty(node, "x"),
      getProperty(node, "y"),
      getProperty(node, "w"),
      getProperty(node, "h")
   );
}

export function decodeNet(net : object) : Net {

   requireProperty(net, "start", "Node");
   requireProperty(net, "end", "Node");

   return new Net(
      decodePortPosition(getProperty(net, "start")),
      decodePortPosition(getProperty(net, "end")),
      checkProperty(net, "segments", "string") ?
         getProperty<string>(net, "segments").split('').map(s => decodeSegment(s)) :
         checkPropertyArray(net, "segments") ?
            getProperty<any[]>(net, "segments").map(s => decodeSegment(s)) :
            [new Segment()]
   );
}

export function decodeData(data : object) : Data {
   let d : Data = new Data();

   checkPropertyArray(data, "nodes");
   d.nodes = getProperty<any[]>(data, "nodes").map(s => decodeBlock(s));

   if (checkPropertyArray(data, "nets")) {
      d.nets = getProperty<any[]>(data, "nets").map(n => decodeNet(n));
   }

   return d;
}