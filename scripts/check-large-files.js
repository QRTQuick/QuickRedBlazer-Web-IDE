#!/usr/bin/env node
// scripts/check-large-files.js
// Checks staged files and fails if any staged file is larger than 50 MB

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const MAX_BYTES = 40 * 1024 * 1024 // 40 MB

function getStagedFiles(){
  try{
    const out = execSync('git diff --cached --name-only --diff-filter=ACM', {encoding:'utf8'})
    return out.split(/\r?\n/).filter(Boolean)
  }catch(e){
    return []
  }
}

const staged = getStagedFiles()
if(staged.length===0){
  process.exit(0)
}

const offenders = []
for(const rel of staged){
  try{
    const p = path.resolve(process.cwd(), rel)
    if(fs.existsSync(p)){
      const stat = fs.statSync(p)
      if(stat.isFile() && stat.size > MAX_BYTES){
        offenders.push({file: rel, size: stat.size})
      }
    }
  }catch(e){/* ignore */}
}

if(offenders.length>0){
  console.error('\nERROR: commit rejected because one or more staged files exceed 40 MB:')
  for(const o of offenders){
    console.error(` - ${o.file} (${(o.size/1024/1024).toFixed(2)} MB)`) 
  }
  console.error('\nPlease remove large files from the commit (git reset HEAD <file>), add them to .gitignore or use Git LFS for large assets.')
  process.exit(1)
}

process.exit(0)
