import Path from 'path'
import Fs from 'fs-promise'
import renderMarkdown from 'marked-promise'
import { loadFront } from 'front-matter'
import { highlightAuto } from 'highlight.js'

export const CONTENT_DIR = Path.join(__dirname, '../content')

renderMarkdown.setOptions({
  highlight (code) {
    return highlightAuto(code).value
  }
})

export async function loadContent (contentPath) {
  contentPath = Path.resolve(CONTENT_DIR, contentPath)
  const contentFile = await Fs.readFile(contentPath)
  const { __content: markdown, ...data } = loadFront(contentFile)
  const content = await renderMarkdown(markdown)
  const name = Path.basename(contentPath, Path.extname(contentPath))
  return { name, data, content }
}

export async function loadCollection (collectionDirectory) {
  collectionDirectory = Path.resolve(CONTENT_DIR, collectionDirectory)
  const contentPaths = Fs.readdir(collectionDirectory)
  const transformPathToContent = contentPath => loadItem(Path.join(collectionDirectory, contentPath))
  const contentPromises = contentPaths.map(transformPathToContent)
  const content = await Promise.all(contentPromises)
  return content
}
