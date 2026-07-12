/**
 * Atlas API Playground — Monaco Editor Integration
 * Interactive API playground for Atlas library
 */

(function() {
  'use strict';

  // Configuration
  const PLAYGROUND_CONFIG = {
    atlasVersion: '0.13.1',
    monacoVersion: '0.45.0',
    defaultCode: `// Atlas API Playground v0.13.1
// Try the examples below or write your own code

import { Atlas } from '@data-wise/atlas';

async function main() {
  // Initialize Atlas
  const atlas = new Atlas({
    storage: 'filesystem',
    configPath: '~/.atlas'
  });

  // 1. Start a work session
  const session = await atlas.sessions.start({
    project: 'my-project',
    task: 'refactor auth middleware',
    estimatedMinutes: 90
  });
  console.log('Session started:', session.id);

  // 2. Quick capture an idea
  await atlas.capture.add('Add rate limiting to API', {
    type: 'task',
    project: 'my-project',
    tags: ['api', 'security']
  });

  // 3. Check current context
  const context = await atlas.context.where('my-project');
  console.log('Current context:', context);

  // 4. View analytics
  const stats = await atlas.stats({ days: 7 });
  console.log('Weekly stats:', stats);

  // 5. End session
  const ended = await atlas.sessions.end('completed auth refactor');
  console.log('Session ended:', ended.duration, 'minutes');

  // Clean up
  await atlas.close();
}

main().catch(console.error);`
  };

  // State
  let monacoLoaded = false;
  let editor = null;
  let outputElement = null;
  let runButton = null;

  // Load Monaco Editor dynamically
  function loadMonaco() {
    return new Promise((resolve, reject) => {
      if (window.monaco) {
        resolve();
        return;
      }

      // Check if already loading
      if (document.getElementById('monaco-loader')) {
        const checkInterval = setInterval(() => {
          if (window.monaco) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
        return;
      }

      // Create loader script
      const script = document.createElement('script');
      script.id = 'monaco-loader';
      script.src = `https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/loader.js`;
      script.onload = () => {
        // Configure Monaco
        require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' }});
        require(['vs/editor/editor.main'], () => {
          monacoLoaded = true;
          resolve();
        });
      };
      script.onerror = () => reject(new Error('Failed to load Monaco Editor'));
      document.head.appendChild(script);
    });
  }

  // Create playground UI
  function createPlayground(container) {
    container.innerHTML = \`
      <div class="atlas-playground" style="display: flex; flex-direction: column; height: 600px; border: 1px solid var(--atlas-outline-variant); border-radius: var(--atlas-radius-md); overflow: hidden; background: var(--atlas-surface); font-family: var(--atlas-font-body);">
        <!-- Toolbar -->
        <div class="playground-toolbar" style="display: flex; gap: 8px; padding: 12px 16px; border-bottom: 1px solid var(--atlas-outline-variant); background: var(--atlas-surface-variant); flex-wrap: wrap; align-items: center;">
          <span class="playground-title" style="font-family: var(--atlas-font-display); font-weight: 600; font-size: 1rem; color: var(--atlas-on-surface);">🎮 Atlas API Playground</span>
          <span style="flex: 1;"></span>
          <select id="playground-example" style="font-family: var(--atlas-font-ui); font-size: 0.875rem; padding: 6px 10px; border: 1px solid var(--atlas-outline); border-radius: var(--atlas-radius-sm); background: var(--atlas-surface); color: var(--atlas-on-surface);">
            <option value="starter">📝 Starter Template</option>
            <option value="session-management">⏱️ Session Management</option>
            <option value="capture-inbox">📥 Capture & Inbox</option>
            <option value="project-registry">📁 Project Registry</option>
            <option value="task-management">✅ Task Management</option>
            <option value="analytics">📊 Analytics & Stats</option>
            <option value="context-switching">🔄 Context Switching</option>
            <option value="mcp-integration">🤖 MCP Integration</option>
          </select>
          <button id="playground-run" class="playground-btn" style="font-family: var(--atlas-font-ui); font-weight: 600; font-size: 0.875rem; padding: 8px 16px; background: var(--atlas-primary); color: white; border: none; border-radius: var(--atlas-radius-sm); cursor: pointer; transition: background 0.15s ease;">
            ▶ Run
          </button>
          <button id="playground-clear" class="playground-btn" style="font-family: var(--atlas-font-ui); font-size: 0.875rem; padding: 8px 16px; background: transparent; color: var(--atlas-on-surface-variant); border: 1px solid var(--atlas-outline); border-radius: var(--atlas-radius-sm); cursor: pointer;">
            Clear Output
          </button>
          <button id="playground-copy" class="playground-btn" style="font-family: var(--atlas-font-ui); font-size: 0.875rem; padding: 8px 16px; background: transparent; color: var(--atlas-on-surface-variant); border: 1px solid var(--atlas-outline); border-radius: var(--atlas-radius-sm); cursor: pointer;">
            📋 Copy Code
          </button>
        </div>

        <!-- Editor -->
        <div id="playground-editor" style="flex: 1; position: relative; min-height: 350px;"></div>

        <!-- Output -->
        <div class="playground-output-container" style="border-top: 1px solid var(--atlas-outline-variant); background: var(--atlas-surface-variant); max-height: 200px; overflow: auto;">
          <div class="output-header" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 16px; border-bottom: 1px solid var(--atlas-outline-variant); font-family: var(--atlas-font-ui); font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--atlas-on-surface-variant);">
            <span>📟 Output</span>
            <span id="output-timestamp" style="font-size: 0.7rem; opacity: 0.7;"></span>
          </div>
          <pre id="playground-output" style="margin: 0; padding: 16px; font-family: var(--atlas-font-mono); font-size: 0.8125rem; line-height: 1.5; color: var(--atlas-on-surface); white-space: pre-wrap; word-wrap: break-word; min-height: 100px;"></pre>
        </div>
      </div>
    \`;

    // Initialize after DOM ready
    setTimeout(() => initializePlayground(), 0);
  }

  // Initialize playground
  async function initializePlayground() {
    const editorContainer = document.getElementById('playground-editor');
    const outputElement = document.getElementById('playground-output');
    const runButton = document.getElementById('playground-run');
    const clearButton = document.getElementById('playground-clear');
    const copyButton = document.getElementById('playground-copy');
    const exampleSelect = document.getElementById('playground-example');
    const timestampElement = document.getElementById('output-timestamp');

    outputElement.textContent = '🎮 Atlas API Playground ready. Select an example or write your own code, then click Run.';

    // Load Monaco
    try {
      await loadMonaco();
    } catch (err) {
      outputElement.textContent = '❌ Failed to load Monaco Editor: ' + err.message;
      return;
    }

    // Create editor
    editor = monaco.editor.create(document.getElementById('playground-editor'), {
      value: PLAYGROUND_CONFIG.defaultCode,
      language: 'typescript',
      theme: document.body.hasAttribute('data-md-color-scheme') && document.body.getAttribute('data-md-color-scheme') === 'slate' ? 'vs-dark' : 'vs',
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 13,
      lineNumbers: 'on',
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 2,
      wordWrap: 'on',
      bracketPairColorization: { enabled: true },
      guides: { bracketPairs: true },
      fontFamily: 'JetBrains Mono, monospace',
      fontLigatures: true,
      renderLineHighlight: 'all',
      scrollBeyondLastLine: false,
      smoothScrolling: true
    });

    // Apply theme based on current color scheme
    const updateTheme = () => {
      const isDark = document.body.hasAttribute('data-md-color-scheme') && document.body.getAttribute('data-md-color-scheme') === 'slate';
      monaco.editor.setTheme(isDark ? 'vs-dark' : 'vs');
    };
    updateTheme();

    // Watch for theme changes
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-md-color-scheme'] });

    // Example templates
    const examples = {
      starter: PLAYGROUND_CONFIG.defaultCode,
      'session-management': \`// Session Management Example
import { Atlas } from '@data-wise/atlas';

async function main() {
  const atlas = new Atlas({ storage: 'filesystem' });

  // Start session with options
  const session = await atlas.sessions.start({
    project: 'my-project',
    task: 'implement user authentication',
    estimatedMinutes: 120,
    energyLevel: 'high'
  });

  // Check session status
  const status = await atlas.sessions.status();
  console.log('Active session:', status);

  // Pause/resume
  // await atlas.sessions.pause();
  // await atlas.sessions.resume();

  // End with outcome
  const ended = await atlas.sessions.end('completed JWT auth flow');
  console.log('Duration:', ended.duration, 'minutes');
}

main().catch(console.error);\`,

      'capture-inbox': \`// Capture & Inbox Example
import { Atlas } from '@data-wise/atlas';

async function main() {
  const atlas = new Atlas({ storage: 'filesystem' });

  // Quick capture (instant, non-blocking)
  await atlas.capture.add('Add rate limiting to API');
  await atlas.capture.add('Fix OAuth redirect bug', { type: 'bug', project: 'auth-service' });
  await atlas.capture.add('Question: Why does JWT expire so fast?', { type: 'question' });

  // View inbox
  const inbox = await atlas.inbox({ limit: 10 });
  console.log('Inbox:', inbox);

  // Get stats
  const stats = await atlas.capture.counts();
  console.log('Inbox stats:', stats);

  // Triage (interactive)
  // await atlas.inbox.triage();

  // Filter by type
  const tasks = await atlas.inbox({ type: 'task', project: 'api' });
  console.log('Tasks:', tasks);
}

main().catch(console.error);\`,

      'project-registry': \`// Project Registry Example
import { Atlas } from '@data-wise/atlas';

async function main() {
  const atlas = new Atlas({ storage: 'filesystem' });

  // Register project
  const project = await atlas.projects.register({
    path: '/home/user/projects/my-api',
    name: 'my-api',
    tags: ['node', 'api', 'production'],
    status: 'active'
  });

  // List projects with filters
  const projects = await atlas.projects.list({
    status: 'active',
    tag: 'api',
    kind: 'package'
  });

  // Get project details
  const detail = await atlas.projects.get('my-api');
  console.log('Project:', detail);

  // Set focus
  await atlas.projects.focus('my-api', 'implement rate limiting');

  // Sync from .STATUS files
  const result = await atlas.sync({ paths: ['~/projects'], fromStatus: true });
  console.log('Synced:', result);
}

main().catch(console.error);\`,

      'task-management': \`// Task Management Example
import { Atlas } from '@data-wise/atlas';

async function main() {
  const atlas = new Atlas({ storage: 'filesystem' });

  // Add tasks
  await atlas.tasks.add('Write unit tests for auth', {
    project: 'my-app',
    priority: 'P1',
    dueDate: '2024-01-15'
  });

  await atlas.tasks.add('Update dependencies', {
    project: 'my-app',
    priority: 'P3'
  });

  // List tasks
  const tasks = await atlas.tasks.list({
    project: 'my-app',
    incomplete: true
  });

  // Filter by priority
  const urgent = await atlas.tasks.list({ priority: 'P1' });

  // Overdue
  const overdue = await atlas.tasks.list({ overdue: true });

  // Complete task
  await atlas.tasks.done(1);

  // Agenda view (merged schedule)
  const agenda = await atlas.agenda(7);
  console.log('Next 7 days:', agenda);
}

main().catch(console.error);\`,

      analytics: \`// Analytics & Stats Example
import { Atlas } from '@data-wise/atlas';

async function main() {
  const atlas = new Atlas({ storage: 'filesystem' });

  // Weekly stats
  const weekly = await atlas.stats({ period: 'week' });
  console.log('This week:', weekly);

  // Velocity (4-week trend)
  const velocity = await atlas.stats({ velocity: true });
  console.log('Velocity:', velocity);

  // Patterns (best hours/days)
  const patterns = await atlas.stats({ patterns: true });
  console.log('Patterns:', patterns);

  // Calibration (estimate accuracy)
  const calibration = await atlas.stats({ 
    calibrate: 'my-project', 
    minutes: 30 
  });
  console.log('Calibration:', calibration);

  // Export
  const exportData = await atlas.stats({ format: 'json' });
  console.log('Export:', exportData);
}

main().catch(console.error);\`,

      'context-switching': \`// Context Switching (Park/Unpark)
import { Atlas } from '@data-wise/atlas';

async function main() {
  const atlas = new Atlas({ storage: 'filesystem' });

  // Working on Project A...
  await atlas.sessions.start('project-a', 'deep work on auth');

  // Urgent interrupt! Need to switch to Project B
  await atlas.context.park('mid-refactor: extracted UserService, need tests');
  // Context saved: project, focus, breadcrumbs, session time

  // Switch to Project B
  await atlas.sessions.start('project-b', 'hotfix: payment timeout');

  // ... fix the bug ...
  await atlas.sessions.end('fixed payment timeout');

  // Return to Project A
  const restored = await atlas.context.unpark();
  console.log('Restored:', restored);
  // Restored: project-a, focus restored, breadcrumbs restored

  // List all parked
  const parked = await atlas.context.parked();
  console.log('Parked:', parked);
}

main().catch(console.error);\`,

      'mcp-integration': \`// MCP Server Integration (Claude Desktop)
import { Atlas } from '@data-wise/atlas';

async function main() {
  // Atlas MCP server exposes these tools to Claude:
  // - atlas_get_context
  // - atlas_get_projects
  // - atlas_get_sessions
  // - atlas_start_session
  // - atlas_end_session
  // - atlas_capture
  // - atlas_breadcrumb
  // - atlas_get_inbox
  // - atlas_get_trail
  // - atlas_plan

  // In Claude Desktop config:
  // {
  //   "mcpServers": {
  //     "atlas": {
  //       "command": "atlas",
  //       "args": ["mcp"]
  //     }
  //   }
  // }

  // Then in Claude:
  // "What was I working on yesterday?"
  // "Start a session on my-api project"
  // "Capture this idea for later"
  // "Show my weekly stats"

  console.log('MCP Integration: Configure in Claude Desktop settings');
  console.log('See: https://data-wise.github.io/atlas/MCP-SERVER.md');
}

main().catch(console.error);\`
    };

    // Load example
    exampleSelect.addEventListener('change', () => {
      const example = examples[exampleSelect.value];
      if (example) {
        editor.setValue(example);
      }
    });

    // Run code (simulated)
    runButton.addEventListener('click', async () => {
      const code = editor.getValue();
      const timestamp = new Date().toLocaleTimeString();
      timestampElement.textContent = timestamp;
      
      // Simulate execution (in real implementation, would use Web Worker or iframe)
      runButton.disabled = true;
      runButton.textContent = '⏳ Running...';
      
      try {
        // Simulate execution delay
        await new Promise(r => setTimeout(r, 500));
        
        // In a real implementation, this would execute in a sandbox
        // For demo, we show the code would run
        outputElement.textContent = \`✅ Code executed successfully at \${timestamp}
\`\`\`typescript
// Your code executed successfully!
// In a real implementation, this would run in a secure sandbox.
// Output would appear here.
\`\`\`
\`\`\`typescript
\${code.substring(0, 500)}\${code.length > 500 ? '...' : ''}
\`\`\`
        `;
        timestampElement.textContent = new Date().toLocaleTimeString();
      } catch (err) {
        outputElement.textContent = \`❌ Error: \${err.message}\`;
      } finally {
        runButton.disabled = false;
        runButton.textContent = '▶ Run';
        timestampElement.textContent = new Date().toLocaleTimeString();
      }
    });

    // Clear output
    clearButton.addEventListener('click', () => {
      outputElement.textContent = '🎮 Atlas API Playground ready. Select an example or write your own code, then click Run.';
      timestampElement.textContent = '';
    });

    // Copy code
    copyButton.addEventListener('click', async () => {
      const code = editor.getValue();
      try {
        await navigator.clipboard.writeText(code);
        const originalText = copyButton.textContent;
        copyButton.textContent = '✅ Copied!';
        setTimeout(() => copyButton.textContent = originalText, 2000);
      } catch (err) {
        console.error('Copy failed:', err);
      }
    });

    // Set initial example
    exampleSelect.value = 'starter';
  }

  // Expose for manual initialization
  window.AtlasPlayground = { createPlayground, initializePlayground };
})();