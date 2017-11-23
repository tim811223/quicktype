"use strict";

import { OrderedSet, Map, Set } from "immutable";
import { Type, PrimitiveType, ClassType, ArrayType, MapType, EnumType, UnionType, TopLevels } from "./Type";
import { GlueClassEntry, GlueGraph, GlueType, GlueTypeNames } from "Reykjavik";
import { panic } from "./Support";

function glueTypeNamesToNative({ names }: GlueTypeNames): OrderedSet<string> {
    return OrderedSet(names);
}

function glueTypeToNative(type: GlueType, classes: (Type | null)[]): Type {
    switch (type.kind) {
        case "array": {
            const items = glueTypeToNative(type.items, classes);
            return new ArrayType(items);
        }
        case "class": {
            const c = classes[type.index];
            if (c === null) {
                return panic("Expected class is not in graph array");
            }
            return c;
        }
        case "map": {
            const values = glueTypeToNative(type.values, classes);
            return new MapType(values);
        }
        case "enum": {
            return new EnumType(glueTypeNamesToNative(type.names), OrderedSet(type.cases));
        }
        case "union": {
            const members = type.members.map(t => glueTypeToNative(t, classes));
            return new UnionType(glueTypeNamesToNative(type.names), OrderedSet(members));
        }
        default:
            return new PrimitiveType(type.kind);
    }
}

function glueTypesToNative(glueEntries: GlueClassEntry[]): (Type | null)[] {
    const classes: (ClassType | null)[] = [];
    for (const c of glueEntries) {
        if (c === null) {
            classes.push(null);
        } else {
            classes.push(new ClassType(glueTypeNamesToNative(c.names)));
        }
    }

    for (let i = 0; i < classes.length; i++) {
        const c = classes[i];
        if (c === null) {
            continue;
        }
        const glueProperties = Map(glueEntries[i].properties);
        c.setProperties(glueProperties.map((t: GlueType) => glueTypeToNative(t, classes)).toMap());
    }

    return classes;
}

export function glueGraphToNative(glueGraph: GlueGraph): TopLevels {
    const classes = glueTypesToNative(glueGraph.classes);
    const result = Map(glueGraph.toplevels)
        .map((t: GlueType) => glueTypeToNative(t, classes))
        .toMap();
    return result;
}
