# node-memory-constraining-problem

A repo reproducing the problem Node and the v8 GC has with Buffers and memory constrained environments

## Installing

You don't need to do anything! Feel free to `npm ci`, but there are no dependencies. :-)

## Reproducing the problem

Run

```sh
$ npm run reproduce

Press Ctrl+C to terminate
memory: [ 'rss', 88 ] [ 'heapTotal', 36 ] [ 'heapUsed', 34 ] [ 'external', 61 ]
memory: [ 'rss', 88 ] [ 'heapTotal', 37 ] [ 'heapUsed', 34 ] [ 'external', 91 ]
...
```

After a while, the process ends, by being OOMKilled by docker (that is what exit code 137 means).

## What `npm run reproduce` does

First, it builds a docker image using `Dockerfile`, which runs `index.js`.

Then it runs the image on a memory-constrained container §9using docker's `--memory`).

The code in `index.js` is an infinite loop that:

1. Allocates 30MB (short-lived, not added to any global)
1. Prints the memory usage (using `process.memoryUsage`)
1. Waits for 50ms

## What it means

* Given that the loop allocates a short-lived Buffer, and also returns control to the event loop,
  the program should either be killed almost instantly, or run forever courtesy of the GC.
* And if you change allocation to allocate strings (of the same size),
  using `ALLOC_METHOD=stringAllocation npm run reproduce`, it _will_ run forever.
* But it doesn't. After less than a minute, it dies.
* And that is a problem in memory-constrained environments such as Kubernetes.
* See "Analysis" below for more on the problem.

## Customizing `npm run reproduce`

You can use environment variables to customize the loop in `index.js`:

* `MEMORY_LIMIT`: the memory limit we specify to docker. Default: 70m
* `OLD_SPACE`: how much to give to `max-old-space-size`. Default: 50
* `WAIT_BETWEEN_ALLOCS`: how much to wait between each alloc in the loop (ms). Default: 50
* `ALLOC_METHOD`: how to allocate the memory. Default: `bufferAllocation`. Options:
  * `bufferAllocation`: allocate a 30mb buffer
  * `fileBufferAllocation`: fs.readSync a 30mb file to a buffer
  * `stringAllocation`: allocate a string of 30mb size

## Running outside of docker

Just use `npm start`.

## Analysis

* It seems (after talking to varios NodeJS and v8 people), that Buffer allocates the "real" buffer memory that is called "external", i.e.
  memory that is not calculated as part of the "old generation space".
* Thus, if I constrain v8's `max-old-space-size`, the memory of the buffer is just a few bytes, rather than it's real size.
* So v8, when figuring out whether it needs to GC, decides it doesn't need to do anything, because it doesn't take the external size into
  account.
* So overall memory goes up without the GC doing anything, and after a while, Docker OOMKills the process.
* What _should_ be done is enabling a `--max-heap-size` parameter in Node that takes into account all heaps in v8:
  old generation heap _and_ external heap. Maybe even the nursery heap.
