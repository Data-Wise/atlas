#!/usr/bin/env node
/**
 * Atlas CLI Entry Point
 * Project state engine - registry, sessions, capture, and context management
 */

import { Command } from 'commander';
import { Atlas } from '../src/index.js';

const program = new Command();
const atlas = new Atlas();

// Check for -v early (before Commander.js parses)
if (process.argv.includes('-v')) {
  console.log('0.1.0');
  process.exit(0);
}

program
  .name('atlas')
  .description('Project state engine for ADHD-friendly workflow management')
  .version('0.1.0', '-V, --version', 'output the version number');

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
    const result = await atlas.projects.register(path || process.cwd(), options);
    console.log(result.message);
  });

project
  .command('list')
  .description('List all projects')
  .option('-s, --status <status>', 'Filter by status')
  .option('-t, --tag <tag>', 'Filter by tag')
  .option('--format <format>', 'Output format (table|json|names)', 'table')
  .action(async (options) => {
    const projects = await atlas.projects.list(options);
    atlas.formatOutput(projects, options.format);
  });

project
  .command('show <name>')
  .description('Show project details')
  .option('--format <format>', 'Output format (table|json|shell)', 'table')
  .action(async (name, options) => {
    const project = await atlas.projects.get(name);
    atlas.formatOutput(project, options.format);
  });

project
  .command('remove <name>')
  .description('Unregister a project')
  .action(async (name) => {
    const result = await atlas.projects.unregister(name);
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
      await atlas.projects.setFocus(project, text);
      console.log(`✓ Focus set: "${text}"`);
    } else {
      const focus = await atlas.projects.getFocus(project);
      console.log(focus || '(no focus set)');
    }
  });

program
  .command('status [project]')
  .description('Get or show project status')
  .option('--set <status>', 'Set status (active|paused|blocked|archived)')
  .action(async (project, options) => {
    if (options.set) {
      await atlas.projects.setStatus(project, options.set);
      console.log(`✓ Status: ${options.set}`);
    } else {
      const status = await atlas.context.getStatus(project);
      atlas.formatStatus(status);
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
    const result = await atlas.sessions.start(project);
    console.log(`🎯 Session started: ${result.project}`);
    if (result.focus) console.log(`   Focus: ${result.focus}`);
  });

session
  .command('end [note]')
  .description('End current session')
  .action(async (note) => {
    const result = await atlas.sessions.end(note);
    console.log(`✓ Session ended (${result.duration})`);
  });

session
  .command('status')
  .description('Show current session')
  .action(async () => {
    const session = await atlas.sessions.current();
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
    const result = await atlas.capture.add(text, options);
    console.log(`📥 Captured: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
  });

program
  .command('inbox')
  .description('Show captured items')
  .option('-p, --project <project>', 'Filter by project')
  .option('--triage', 'Interactive triage mode')
  .action(async (options) => {
    const items = await atlas.capture.inbox(options);
    atlas.formatInbox(items);
  });

// ============================================================================
// CONTEXT COMMANDS
// ============================================================================

program
  .command('where [project]')
  .description('Show current context - "Where was I?"')
  .action(async (project) => {
    const context = await atlas.context.where(project);
    atlas.formatContext(context);
  });

program
  .command('crumb <text>')
  .description('Leave a breadcrumb trail marker')
  .option('-p, --project <project>', 'Associate with project')
  .action(async (text, options) => {
    await atlas.context.breadcrumb(text, options.project);
    console.log(`🍞 Breadcrumb: "${text}"`);
  });

program
  .command('trail [project]')
  .description('Show breadcrumb trail')
  .option('-d, --days <days>', 'Days to show', '7')
  .action(async (project, options) => {
    const trail = await atlas.context.trail(project, parseInt(options.days));
    atlas.formatTrail(trail);
  });

// ============================================================================
// UTILITY COMMANDS
// ============================================================================

program
  .command('init')
  .description('Initialize atlas in current directory or globally')
  .option('-g, --global', 'Initialize global atlas config')
  .action(async (options) => {
    const result = await atlas.init(options);
    console.log(result.message);
  });

program
  .command('sync')
  .description('Sync registry from .STATUS files')
  .option('-d, --dry-run', 'Show what would be synced')
  .option('-w, --watch', 'Watch for changes')
  .action(async (options) => {
    const result = await atlas.sync(options);
    console.log(result.message);
  });

// Show help if no command was provided (before parsing to avoid Commander errors)
if (process.argv.length <= 2) {
  program.outputHelp();
  process.exit(0);
}

// Parse and execute
program.parse();
