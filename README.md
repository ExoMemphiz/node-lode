# node-lode

node-lode is a tool that allows you to quickly set up a watchman for copying files from one directory to another.  
It automatically transfers any files that are changed to the destination folder, whenever the files in the source folder are changed.

# Installation

Either through cloning with git or by using [npm](http://npmjs.org) (the recommended way):

```bash
npm i -g node-lode
```

# Usage

node-lode listens for any changes to the files in the given source directory, and will automatically overwrite the destination files when a change is detected.  
If you wish to use it you can either load previous watched folders, or use the command-line arguments `<src> <dst>`.

```bash
node-lode <src> <dst>
```

For CLI options, use the `-h` (or `--help`) argument:

```bash
node-lode -h
```
