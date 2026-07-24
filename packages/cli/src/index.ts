#!/usr/bin/env node

/**
 * novaplan-cli — CLI tool for NovaPlan
 *
 * Usage:
 *   novaplan login --api-key <key>
 *   novaplan project get <id>
 *   novaplan task list <projectId> [--status <status>]
 *   novaplan task update <taskId> --status <status>
 *   novaplan subtask update <subtaskId> --status <status>
 *   novaplan kanban <projectId>
 */

import { Command } from "commander";
import { loginCommand } from "./commands/login.js";
import { projectGetCommand } from "./commands/project.js";
import { taskListCommand, taskUpdateCommand } from "./commands/task.js";
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
  .description("Save API key to local config")
  .option("--api-key <key>", "NovaPlan API key")
  .option("--api-url <url>", "API base URL (default: https://novaplan.vercel.app)")
  .action(loginCommand);

// novaplan project
const projectCmd = program.command("project").description("Project commands");
projectCmd
  .command("get")
  .argument("<id>", "Project UUID")
  .description("Get project data as JSON")
  .action(projectGetCommand);

// novaplan task
const taskCmd = program.command("task").description("Task commands");
taskCmd
  .command("list")
  .argument("<projectId>", "Project UUID")
  .description("List all tasks for a project")
  .option("--status <status>", "Filter by status (pending/in_progress/completed/failed)")
  .action(taskListCommand);
taskCmd
  .command("update")
  .argument("<taskId>", "Task UUID")
  .description("Update task status")
  .requiredOption("--status <status>", "New status (in_progress/completed/failed)")
  .action(taskUpdateCommand);

// novaplan subtask
const subtaskCmd = program.command("subtask").description("Subtask commands");
subtaskCmd
  .command("update")
  .argument("<subtaskId>", "Subtask UUID")
  .description("Update subtask status")
  .requiredOption("--status <status>", "New status (in_progress/completed/failed)")
  .action(subtaskUpdateCommand);

// novaplan kanban
program
  .command("kanban")
  .argument("<projectId>", "Project UUID")
  .description("Show kanban board in terminal")
  .action(kanbanCommand);

program.parse(process.argv);
