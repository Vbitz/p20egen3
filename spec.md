# Project20 Engine Gen3 Specification.

## Previous Generations.

- **Gen1**: Standard Class-Based Structure. Does not handle self-modifying code efficiently.
- **Gen2**: Event-driven Structure. Slow to develop but more flexible then the first solution. Issues with code reuse can cause legal issues without major side stepping.
- **Gen2.5**: Event-driven Structure in JSON. Fast to develop for but less flexible without writing additional code which has the same code reuse issues as Gen2.

## Gen3 Introduction

Gen3 is a rewrite building on the experiences of previous generations. Rather then represent items as a set of components the engine will instead execute byte code written in a DSL.