#!/usr/bin/env node
import { parseArgs } from './util.js'
import { runInit } from './commands/init.js'
import {
  runBoardExport,
  runDoctor,
  runGap,
  runPlan,
  runStatus,
  runSync,
} from './commands/run.js'

const HELP = `Projocalypse — monorepo host integration CLI

Usage:
  projocalypse init [--dry-run]
  projocalypse doctor
  projocalypse plan parse --package <name>
  projocalypse gap --package <name> | --all [--fail-on CODE,...]
  projocalypse sync --package <name> | --all [--dry-run]
  projocalypse status --package <name> | --all
  projocalypse board export --package <name>

See doc/MONOREPO.md for plan format and host setup.
`

async function main(): Promise<void> {
  const args = parseArgs(process.argv)

  switch (args.command) {
    case 'init':
      await runInit(args.flags)
      break
    case 'doctor':
      await runDoctor(args)
      break
    case 'plan':
      await runPlan(args)
      break
    case 'gap':
      await runGap(args)
      break
    case 'sync':
      await runSync(args)
      break
    case 'status':
      await runStatus(args)
      break
    case 'board':
      if (args.positional[0] === 'export') await runBoardExport(args)
      else throw new Error('Unknown board subcommand')
      break
    case 'help':
    case '--help':
    case '-h':
      console.log(HELP)
      break
    default:
      console.error(`Unknown command: ${args.command}\n`)
      console.log(HELP)
      process.exitCode = 1
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
