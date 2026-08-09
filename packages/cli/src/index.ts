#!/usr/bin/env node

/**
 * novaplan-cli — CLI tool for NovaPlan
 *
 * Usage:
 *   novaplan login [--api-key <key>] [--api-url <url>]
 *   novaplan project get <id>
 *   novaplan task list <projectId> [--status <status>]
 *   novaplan task next <projectId>
 *   novaplan task update <taskId> --status <status>
 *   novaplan subtask update <taskId> --index <subtaskIndex> --status <status>
 *   novaplan kanban <projectId>
 */

import { Command } from "commander";
import { loginCommand } from "./commands/login.js";
import { projectGetCommand } from "./commands/project.js";
import { prdCommand } from "./commands/prd.js";
import { acCommand } from "./commands/ac.js";
import { taskListCommand, taskUpdateCommand, taskNextCommand } from "./commands/task.js";
import { subtaskUpdateCommand } from "./commands/subtask.js";
import { kanbanCommand } from "./commands/kanban.js";

const program = new Command();

program
  .name("novaplan")
  .description("CLI tool for NovaPlan — manage projects and tasks from terminal")
  .version("1.0.0");

// novaplan login
program
  .command("login")
  .description("Save API key to local config (interactive if no flag)")
  .option("--api-key <key>", "NovaPlan API key")
  .option("--api-url <url>", "API base URL (default: http://localhost:3000)")
  .action(loginCommand);

// novaplan project
const projectCmd = program.command("project").description("Project commands");
projectCmd
  .command("get")
  .argument("<id>", "Project UUID")
  .description("Get project data as JSON")
  .action(projectGetCommand);

// novaplan prd
program
  .command("prd")
  .argument("<projectId>", "Project UUID")
  .description("Fetch and print PRD content")
  .action(prdCommand);

// novaplan ac
program
  .command("ac")
  .argument("<projectId>", "Project UUID")
  .description("Fetch and print Acceptance Criteria content")
  .action(acCommand);

// novaplan task
const taskCmd = program.command("task").description("Task commands");
taskCmd
  .command("list")
  .argument("<projectId>", "Project UUID")
  .description("List all tasks for a project")
  .option("--status <status>", "Filter by status (pending/in_progress/completed/failed)")
  .action(taskListCommand);
taskCmd
  .command("next")
  .argument("<projectId>", "Project UUID")
  .description("Show next pending task with details")
  .action(taskNextCommand);
taskCmd
  .command("update")
  .argument("<taskId>", "Task UUID")
  .description("Update task status")
  .requiredOption("--status <status>", "New status (pending/in_progress/completed/failed)")
  .action(taskUpdateCommand);

// novaplan subtask
const subtaskCmd = program.command("subtask").description("Subtask commands");
subtaskCmd
  .command("update")
  .argument("<taskId>", "Parent task UUID")
  .description("Update subtask status")
  .requiredOption("--index <index>", "Subtask index (0-based)")
  .requiredOption("--status <status>", "New status (pending/in_progress/completed/failed)")
  .action(subtaskUpdateCommand);

// novaplan kanban
program
  .command("kanban")
  .argument("<projectId>", "Project UUID")
  .description("Show kanban board in terminal")
  .action(kanbanCommand);

program.parse(process.argv);
