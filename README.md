# Sublime-like Search for Visual Studio Code (vscode)

![Screenshot](https://raw.githubusercontent.com/garygreen/sublime-search-vscode/master/sublime-search-vscode.png)

## Commands

*`sublsearch.search` (SublSearch - Search) - Pop open a dialog to ask for search term, and open the results in a nice read only document.  This uses ripgrep.

## Usage

`text` - search **text** in selected folder
`^text` - search **text** with case sensivity
`=text` - search **text** as whole word
`*text` - select multiple folders for search
`+go+js+css*^text` - select multiple folders for search with case sensivity only in __*.go__, __*.js__ and __*.css__ files.

Also you can use "|" delimiter for let parser know, when text started:
`*^|*^text` - search **"*^text"** in multiple folders with case sensivity
`|*text` - search **"*text"**
`+go+js|text` - search **"text"** only in __*.go__ and __*.js__ files.
`-go-js=|text` - search **"text"** as whole word everywere except in __*.go__ and __*.js__ files.

## Differences from malkomalko/searchy

- Improved Windows support
- Context lines
- Delimiters between multiple matches in file
- Select from project folders for search

## Credit

This repository has been forked from [malkomalko/searchy](https://github.com/malkomalko/searchy), mad props to Robert for his great work.
