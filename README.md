# Sublime-like Search for Visual Studio Code / vs code

![Screenshot](https://raw.githubusercontent.com/garygreen/sublime-search-vscode/master/sublime-search-vscode.png)

## Commands

*`searchy.search` (Searchy - Search) - Pop open a dialog to ask for search term, and open the results in a nice read only document.  This uses ripgrep.

## Usage

By default, code will be searched across the active workspace. If you would like to search in a particular folder, right click the folder in vs code, or manually enter the path relative to the active workspace in the popup:

E.g.

>  resources/assets: &lt;search for this text&gt;

Take note of the colon ":" which seperates the folder to search and search text.

## Differences from malkomalko/searchy

- Improved Windows support
- Support for context lines
- Support for 'seperators' between multiple matches in file
- Added context menu
- Lots of other improvements

## Credit

This repository has been forked from [malkomalko/searchy](https://github.com/malkomalko/searchy), mad props to Robert for his great work.
