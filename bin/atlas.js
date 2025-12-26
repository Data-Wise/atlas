#!/usr/bin/env node
/**
 * Atlas CLI Entry Point
 * Project state engine - registry, sessions, capture, and context management
 */

import { Command } from 'commander';
import { Atlas } from '../src/index.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { CelebrationHelper } from '../src/utils/CelebrationHelper.js';
import { ContextRestorationHelper } from '../src/utils/ContextRestorationHelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));

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
  console.log(pkg.version);
  process.exit(0);
}

program
  .name('atlas')
  .description('Project state engine for ADHD-friendly workflow management')
  .version(pkg.version, '-V, --version', 'output the version number')
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
    if (options.format === 'table') {
      getAtlas().formatStatus(project);
    } else {
      getAtlas().formatOutput(project, options.format);
    }
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
  .description('Get or update project status')
  .option('--set <status>', 'Set status (active|paused|blocked|archived|complete)')
  .option('--progress <percent>', 'Set progress (0-100)')
  .option('--focus <text>', 'Set current focus/checkpoint')
  .option('--next <action>', 'Set next action(s) - comma separated')
  .option('--complete', 'Mark current next action as done')
  .option('--then <action>', 'After completing, add this as next action')
  .option('--increment <amount>', 'Increment progress by amount (default: 10)')
  .option('--create', 'Create .STATUS file if missing')
  .action(async (project, options) => {
    const a = getAtlas();
    const hasUpdate = options.set || options.progress || options.focus ||
                      options.next || options.complete || options.increment;

    if (hasUpdate) {
      // Build updates object
      const updates = {};
      if (options.set) updates.status = options.set;
      if (options.progress !== undefined) updates.progress = parseInt(options.progress);
      if (options.focus) updates.focus = options.focus;
      if (options.next) {
        updates.next = options.next.split(',').map(n => n.trim());
      }

      // Handle complete action with optional next action
      if (options.complete) {
        const result = await a.projects.completeNextAction(project, options.then);
        console.log(result.message);
        return;
      }

      // Handle increment
      if (options.increment !== undefined) {
        const result = await a.projects.incrementProgress(
          project,
          parseInt(options.increment) || 10
        );
        console.log(result.message);
        return;
      }

      // Apply updates
      if (Object.keys(updates).length > 0) {
        const result = await a.projects.update(project, {
          ...updates,
          createIfMissing: options.create
        });
        console.log(result.message);
        if (result.changes?.length > 0) {
          result.changes.forEach(c => console.log(`   ${c}`));
        }
      }
    } else {
      // Just show status
      const status = await a.context.getStatus(project);
      a.formatStatus(status);
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
    const atlasInstance = getAtlas();

    // Get context restoration before starting
    try {
      const status = await atlasInstance.context.getStatus();
      const recentSessions = status?.recent?.recentSessions || [];
      const lastSession = recentSessions.find(s => s.project === project);
      const streakData = status?.streak || { current: 0 };

      if (lastSession || streakData.current > 0) {
        const welcome = ContextRestorationHelper.getWelcomeBack(lastSession, streakData.current);
        console.log(`\n${welcome}`);
      }
    } catch (e) { /* ignore context errors */ }

    const result = await atlasInstance.sessions.start(project);
    console.log(`🎯 Session started: ${result.project}`);
    if (result.focus) console.log(`   Focus: ${result.focus}`);
  });

session
  .command('end [note]')
  .description('End current session')
  .action(async (note) => {
    const atlasInstance = getAtlas();

    // Get session info before ending for celebration
    let duration = 0;
    let streakCount = 0;
    try {
      const status = await atlasInstance.context.getStatus();
      duration = status?.activeSession?.duration || 0;
      streakCount = status?.streak?.current || 0;
    } catch (e) { /* ignore */ }

    const result = await atlasInstance.sessions.end(note);
    console.log(`✓ Session ended (${result.duration})`);

    // Show celebration
    const celebration = CelebrationHelper.getCelebration({
      duration,
      outcome: 'completed',
      streak: streakCount
    });
    console.log(`\n${celebration.emoji} ${celebration.message}`);

    // Show milestones if any
    if (celebration.milestones.length > 0) {
      celebration.milestones.forEach(m => {
        console.log(`   ${m.icon} ${m.message}`);
      });
    }
  });

session
  .command('status')
  .description('Show current session')
  .action(async () => {
    const session = await getAtlas().sessions.current();
    if (session) {
      const duration = session.getDuration ? session.getDuration() : '?';
      console.log(`Active: ${session.project} (${duration}m)`);
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
  .option('--stats', 'Show inbox statistics')
  .action(async (options) => {
    const a = getAtlas();

    if (options.stats) {
      const triageUseCase = a.container.resolve('TriageInboxUseCase');
      const stats = await triageUseCase.getStats();
      console.log('\n📊 INBOX STATS');
      console.log('─'.repeat(30));
      console.log(`📥 Inbox: ${stats.inbox}`);
      console.log(`✓  Triaged: ${stats.triaged}`);
      console.log(`📦 Archived: ${stats.archived}`);
      if (Object.keys(stats.byType).length > 0) {
        console.log('\nBy type:');
        Object.entries(stats.byType).forEach(([type, count]) => {
          const icon = type === 'task' ? '☐' : type === 'bug' ? '🐛' : type === 'question' ? '❓' : '💡';
          console.log(`  ${icon} ${type}: ${count}`);
        });
      }
      return;
    }

    if (options.triage) {
      await runTriageMode(a);
      return;
    }

    const items = await a.capture.inbox(options);
    a.formatInbox(items);
  });

/**
 * Interactive triage mode
 */
async function runTriageMode(atlas) {
  const readline = await import('readline');
  const triageUseCase = atlas.container.resolve('TriageInboxUseCase');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

  console.log('\n🔄 TRIAGE MODE');
  console.log('─'.repeat(40));
  console.log('Commands: [a]ssign, [s]kip, [d]elete, [q]uit');
  console.log('');

  let processed = 0;
  let skipped = 0;

  while (true) {
    const item = await triageUseCase.getNextItem();

    if (!item) {
      console.log('\n📭 Inbox empty! Nice work.');
      break;
    }

    // Display item
    const icon = item.type === 'task' ? '☐' : item.type === 'bug' ? '🐛' : item.type === 'question' ? '❓' : '💡';
    console.log(`\n${icon} [${item.type}] ${item.text}`);
    console.log(`   Age: ${item.getAge()} | ID: ${item.id.slice(0, 12)}...`);
    if (item.project) console.log(`   Project: ${item.project}`);

    const answer = await question('\nAction (a/s/d/q): ');
    const action = answer.trim().toLowerCase();

    switch (action) {
      case 'a':
      case 'assign':
        const projectName = await question('Project name: ');
        if (projectName.trim()) {
          try {
            const result = await triageUseCase.assign(item.id, projectName.trim());
            console.log(`✓ ${result.message}`);
            processed++;
          } catch (err) {
            console.log(`✗ ${err.message}`);
          }
        } else {
          console.log('Skipped (no project entered)');
          skipped++;
        }
        break;

      case 's':
      case 'skip':
        console.log('→ Skipped');
        skipped++;
        // Move to end of queue by archiving and re-adding (or just break out)
        break;

      case 'd':
      case 'delete':
      case 'x':
        await triageUseCase.archive(item.id);
        console.log('✗ Archived');
        processed++;
        break;

      case 'q':
      case 'quit':
        console.log(`\n✓ Triage complete: ${processed} processed, ${skipped} skipped`);
        rl.close();
        return;

      default:
        console.log('Unknown action. Use: a(ssign), s(kip), d(elete), q(uit)');
    }
  }

  console.log(`\n✓ Triage complete: ${processed} processed, ${skipped} skipped`);
  rl.close();
}

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
// DASHBOARD COMMAND
// ============================================================================

program
  .command('dashboard')
  .alias('dash')
  .description('Launch interactive dashboard TUI')
  .action(async () => {
    const { runDashboard } = await import('../src/cli/dashboard.js');
    await runDashboard(getAtlas());
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

program
  .command('completions [shell]')
  .description('Generate shell completions (zsh|bash|fish)')
  .action(async (shell) => {
    const { readFileSync } = await import('fs');
    const { fileURLToPath } = await import('url');
    const { dirname, join } = await import('path');

    const __dirname = dirname(fileURLToPath(import.meta.url));
    const completionsDir = join(__dirname, '..', 'completions');

    const supportedShells = ['zsh', 'bash', 'fish'];

    if (!shell) {
      console.log('Shell completions for Atlas CLI\n');
      console.log('Available shells: zsh, bash, fish\n');
      console.log('Installation:');
      console.log('  ZSH:  eval "$(atlas completions zsh)" >> ~/.zshrc');
      console.log('  Bash: eval "$(atlas completions bash)" >> ~/.bashrc');
      console.log('  Fish: atlas completions fish > ~/.config/fish/completions/atlas.fish');
      return;
    }

    if (!supportedShells.includes(shell)) {
      console.error(`Unsupported shell: ${shell}. Use: zsh, bash, or fish`);
      process.exit(1);
    }

    const filename = `atlas.${shell}`;
    const content = readFileSync(join(completionsDir, filename), 'utf-8');
    console.log(content);
  });

// ============================================================================
// CONFIG COMMANDS
// ============================================================================

const config = program.command('config').description('Manage atlas configuration');

config
  .command('paths')
  .description('Show configured scan paths')
  .action(async () => {
    const paths = await getAtlas().config.getScanPaths();
    console.log('Configured scan paths:');
    paths.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));
  });

config
  .command('add-path <path>')
  .description('Add a scan path')
  .action(async (path) => {
    const { resolve } = await import('path');
    const absolutePath = resolve(path.replace(/^~/, process.env.HOME));
    const paths = await getAtlas().config.addScanPath(absolutePath);
    console.log(`Added: ${absolutePath}`);
    console.log(`\nCurrent paths (${paths.length}):`);
    paths.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));
  });

config
  .command('remove-path <path>')
  .description('Remove a scan path')
  .action(async (path) => {
    const { resolve } = await import('path');
    const absolutePath = resolve(path.replace(/^~/, process.env.HOME));
    const paths = await getAtlas().config.removeScanPath(absolutePath);
    console.log(`Removed: ${absolutePath}`);
    console.log(`\nCurrent paths (${paths.length}):`);
    paths.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));
  });

config
  .command('show')
  .description('Show all configuration')
  .action(async () => {
    const cfg = await getAtlas().config.load();
    console.log(JSON.stringify(cfg, null, 2));
  });

// Preferences subcommand
const prefs = config.command('prefs').description('Manage preferences');

prefs
  .command('show')
  .description('Show all preferences')
  .action(async () => {
    const preferences = await getAtlas().config.getPreferences();
    console.log(JSON.stringify(preferences, null, 2));
  });

prefs
  .command('get <path>')
  .description('Get a preference (e.g., adhd.showStreak)')
  .action(async (path) => {
    const value = await getAtlas().config.getPreference(path);
    if (value === undefined) {
      console.log(`Preference '${path}' not found`);
    } else if (typeof value === 'object') {
      console.log(JSON.stringify(value, null, 2));
    } else {
      console.log(value);
    }
  });

prefs
  .command('set <path> <value>')
  .description('Set a preference (e.g., adhd.showStreak false)')
  .action(async (path, value) => {
    // Parse value type
    let parsedValue = value;
    if (value === 'true') parsedValue = true;
    else if (value === 'false') parsedValue = false;
    else if (value === 'null') parsedValue = null;
    else if (!isNaN(Number(value))) parsedValue = Number(value);

    await getAtlas().config.setPreference(path, parsedValue);
    console.log(`✓ Set ${path} = ${JSON.stringify(parsedValue)}`);
  });

prefs
  .command('reset')
  .description('Reset all preferences to defaults')
  .action(async () => {
    await getAtlas().config.resetPreferences();
    console.log('✓ Preferences reset to defaults');
  });

prefs
  .command('defaults')
  .description('Show default preference values')
  .action(() => {
    const Config = require('../src/utils/Config.js').default;
    const defaults = Config.getDefaults();
    console.log(JSON.stringify(defaults.preferences, null, 2));
  });

// Show help if no command was provided (before parsing to avoid Commander errors)
if (process.argv.length <= 2) {
  program.outputHelp();
  process.exit(0);
}

// Parse and execute
program.parse();
