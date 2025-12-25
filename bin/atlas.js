#!/usr/bin/env node
/**
 * Atlas CLI Entry Point
 * Project state engine - registry, sessions, capture, and context management
 */

import { Command } from 'commander';
import { Atlas } from '../src/index.js';

const program = new Command();

// Lazy-initialized Atlas instance (after options are parsed)
let atlas = null;

/**
 * Get or create Atlas instance with parsed options
 */
function getAtlas() {
  if (!atlas) {
    const opts = program.opts();
    atlas = new Atlas({
      storage: opts.storage || process.env.ATLAS_STORAGE || 'filesystem'
    });
  }
  return atlas;
}

// Check for -v early (before Commander.js parses)
if (process.argv.includes('-v')) {
  console.log('0.1.0');
  process.exit(0);
}

program
  .name('atlas')
  .description('Project state engine for ADHD-friendly workflow management')
  .version('0.1.0', '-V, --version', 'output the version number')
  .option('--storage <type>', 'Storage backend: filesystem or sqlite', 'filesystem');

// Handle unknown commands
program.on('command:*', function (operands) {
  console.error(`error: unknown command '${operands[0]}'`);
  process.exit(1);
});

// ============================================================================
// PROJECT COMMANDS
// ============================================================================

const project = program.command('project').description('Project registry operations');

project
  .command('add [path]')
  .description('Register a project')
  .option('-t, --tags <tags>', 'Comma-separated tags')
  .option('-s, --status <status>', 'Initial status (active|paused|archived)')
  .action(async (path, options) => {
    const result = await getAtlas().projects.register(path || process.cwd(), options);
    console.log(result.message);
  });

project
  .command('list')
  .description('List all projects')
  .option('-s, --status <status>', 'Filter by status')
  .option('-t, --tag <tag>', 'Filter by tag')
  .option('--format <format>', 'Output format (table|json|names)', 'table')
  .action(async (options) => {
    const projects = await getAtlas().projects.list(options);
    getAtlas().formatOutput(projects, options.format);
  });

project
  .command('show <name>')
  .description('Show project details')
  .option('--format <format>', 'Output format (table|json|shell)', 'table')
  .action(async (name, options) => {
    const project = await getAtlas().projects.get(name);
    getAtlas().formatOutput(project, options.format);
  });

project
  .command('remove <name>')
  .description('Unregister a project')
  .action(async (name) => {
    const result = await getAtlas().projects.unregister(name);
    console.log(result.message);
  });

// ============================================================================
// STATUS & FOCUS COMMANDS
// ============================================================================

program
  .command('focus <project> [text]')
  .description('Get or set project focus')
  .action(async (project, text) => {
    if (text) {
      await getAtlas().projects.setFocus(project, text);
      console.log(`✓ Focus set: "${text}"`);
    } else {
      const focus = await getAtlas().projects.getFocus(project);
      console.log(focus || '(no focus set)');
    }
  });

program
  .command('status [project]')
  .description('Get or show project status')
  .option('--set <status>', 'Set status (active|paused|blocked|archived)')
  .action(async (project, options) => {
    if (options.set) {
      await getAtlas().projects.setStatus(project, options.set);
      console.log(`✓ Status: ${options.set}`);
    } else {
      const status = await getAtlas().context.getStatus(project);
      getAtlas().formatStatus(status);
    }
  });

// ============================================================================
// SESSION COMMANDS
// ============================================================================

const session = program.command('session').description('Session management');

session
  .command('start [project]')
  .description('Start a work session')
  .action(async (project) => {
    const result = await getAtlas().sessions.start(project);
    console.log(`🎯 Session started: ${result.project}`);
    if (result.focus) console.log(`   Focus: ${result.focus}`);
  });

session
  .command('end [note]')
  .description('End current session')
  .action(async (note) => {
    const result = await getAtlas().sessions.end(note);
    console.log(`✓ Session ended (${result.duration})`);
  });

session
  .command('status')
  .description('Show current session')
  .action(async () => {
    const session = await getAtlas().sessions.current();
    if (session) {
      console.log(`Active: ${session.project} (${session.duration})`);
    } else {
      console.log('No active session');
    }
  });

// ============================================================================
// CAPTURE COMMANDS
// ============================================================================

program
  .command('catch <text>')
  .description('Quick capture an idea or task')
  .option('-p, --project <project>', 'Associate with project')
  .option('-t, --type <type>', 'Type: idea|task|bug|note', 'idea')
  .action(async (text, options) => {
    const result = await getAtlas().capture.add(text, options);
    console.log(`📥 Captured: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
  });

program
  .command('inbox')
  .description('Show captured items')
  .option('-p, --project <project>', 'Filter by project')
  .option('--triage', 'Interactive triage mode')
  .action(async (options) => {
    const items = await getAtlas().capture.inbox(options);
    getAtlas().formatInbox(items);
  });

// ============================================================================
// CONTEXT COMMANDS
// ============================================================================

program
  .command('where [project]')
  .description('Show current context - "Where was I?"')
  .action(async (project) => {
    const context = await getAtlas().context.where(project);
    getAtlas().formatContext(context);
  });

program
  .command('crumb <text>')
  .description('Leave a breadcrumb trail marker')
  .option('-p, --project <project>', 'Associate with project')
  .action(async (text, options) => {
    await getAtlas().context.breadcrumb(text, options.project);
    console.log(`🍞 Breadcrumb: "${text}"`);
  });

program
  .command('trail [project]')
  .description('Show breadcrumb trail')
  .option('-d, --days <days>', 'Days to show', '7')
  .action(async (project, options) => {
    const trail = await getAtlas().context.trail(project, parseInt(options.days));
    getAtlas().formatTrail(trail);
  });

// ============================================================================
// UTILITY COMMANDS
// ============================================================================

program
  .command('init')
  .description('Initialize atlas in current directory or globally')
  .option('-g, --global', 'Initialize global atlas config')
  .action(async (options) => {
    const result = await getAtlas().init(options);
    console.log(result.message);
  });

program
  .command('sync')
  .description('Sync registry from .STATUS files')
  .option('-d, --dry-run', 'Show what would be synced')
  .option('-w, --watch', 'Watch for changes')
  .option('-p, --paths <paths>', 'Comma-separated root paths to scan')
  .option('--remove-orphans', 'Remove projects no longer on disk')
  .action(async (options) => {
    const syncOptions = {
      dryRun: options.dryRun,
      removeOrphans: options.removeOrphans,
      paths: options.paths ? options.paths.split(',').map(p => p.trim()) : undefined
    };

    if (options.watch) {
      console.log('👁️  Watch mode enabled. Press Ctrl+C to stop.');
      console.log('');

      // Initial sync
      const initialResult = await getAtlas().sync(syncOptions);
      console.log(initialResult.message);
      showSyncStats(initialResult.stats);

      // Watch for changes using polling (simpler than fs.watch for cross-platform)
      const watchInterval = setInterval(async () => {
        try {
          const result = await getAtlas().sync(syncOptions);
          if (result.discovered.length > 0 || result.updated.length > 0) {
            console.log(`\n[${new Date().toLocaleTimeString()}] ${result.message}`);
          }
        } catch (err) {
          console.error(`Watch error: ${err.message}`);
        }
      }, 5000); // Check every 5 seconds

      // Handle Ctrl+C
      process.on('SIGINT', () => {
        clearInterval(watchInterval);
        console.log('\n✓ Watch mode stopped');
        process.exit(0);
      });
    } else {
      const result = await getAtlas().sync(syncOptions);
      console.log(result.message);
      showSyncStats(result.stats);

      if (result.errors.length > 0) {
        console.log('\n⚠️  Errors:');
        result.errors.forEach(e => console.log(`   ${e.path}: ${e.error}`));
      }
    }
  });

/**
 * Show sync statistics
 */
function showSyncStats(stats) {
  if (!stats) return;
  console.log(`   📊 ${stats.totalProjects} projects (${stats.withStatusFile} with .STATUS)`);
  if (stats.active || stats.paused || stats.archived) {
    console.log(`   📈 ${stats.active} active, ${stats.paused} paused, ${stats.archived} archived`);
  }
}

program
  .command('migrate')
  .description('Migrate data between storage backends')
  .option('-f, --from <type>', 'Source storage type', 'filesystem')
  .option('-t, --to <type>', 'Target storage type', 'sqlite')
  .option('--dry-run', 'Show what would be migrated')
  .action(async (options) => {
    const { migrateStorage } = await import('../src/utils/migrate.js');
    const result = await migrateStorage({
      from: options.from,
      to: options.to,
      dataDir: getAtlas().configPath,
      dryRun: options.dryRun
    });
    console.log(result.message);
  });

// Show help if no command was provided (before parsing to avoid Commander errors)
if (process.argv.length <= 2) {
  program.outputHelp();
  process.exit(0);
}

// Parse and execute
program.parse();
