import * as vscode from "vscode";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";


dotenv.config();

const history: Array<{ role: string; parts: Array<{ text: string }> }> = [];


const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  vscode.window.showErrorMessage("Missing GEMINI_API_KEY in .env file");
}
const genAI = new GoogleGenerativeAI(API_KEY as string);

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand("gemini-fixer.start", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage("Open a file to use Gemini Fixer.");
      return;
    }

    const selection = editor.selection;
    const selectedText = editor.document.getText(selection) || editor.document.getText();

	const choice = await vscode.window.showQuickPick([
		"Fix Code",
		"Explain Error",
		"Suggest Faster/Optimized Solutions",
		"AI Debugging (Flow Diagrams & Edge Cases)",
		"Auto Unit Test & Edge Case Generator",
		"Auto CI/CD Integration"
	  ], {
		placeHolder: "Choose an option",
	  });

	  switch (choice) {
		case "Fix Code":
		  await fixCode(editor, selection, selectedText);
		  break;
		case "Explain Error":
		  await explainError(selectedText);
		  break;
		case "Suggest Faster/Optimized Solutions":
		  await suggestOptimizedSolutions(selectedText);
		  break;
		case "AI Debugging (Flow Diagrams & Edge Cases)":
		  await aiDebugging(selectedText);
		  break;
		case "Auto Unit Test & Edge Case Generator":
		  await autoUnitTestGenerator(selectedText);
		  break;
		case "Auto CI/CD Integration":
		  await autoCI_CDIntegration(selectedText);
		  break;
		default:
		  vscode.window.showErrorMessage("No option selected.");
	  }
	});

	context.subscriptions.push(disposable);
  }


  async function suggestOptimizedSolutions(code: string) {
	try {
	  vscode.window.showInformationMessage("Generating optimized solutions...");

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(
      `Analyze the following code and check if it's optimized.
      If it's already optimized, return: "Code is already optimized."
      Otherwise, provide an optimized version of the code and explain why it's better.

      Code:
      ${code}`
    );

    const response = result.response.text();

    if (!response) {
      vscode.window.showErrorMessage("Gemini couldn't suggest optimizations.");
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "optimizedCode",
      "Optimized Code Suggestions",
      vscode.ViewColumn.Beside,
      { enableScripts: true }
    );

    panel.webview.html = getWebviewContent(response);

	} catch (error) {
	  vscode.window.showErrorMessage("Error using Gemini: " + error);
	}
  }

  function getWebviewContent(response: string): string {
    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
          </style>
        </head>
        <body>
          <h2>Optimized Solution</h2>
          <pre>${response}</pre>
        </body>
      </html>
    `;
  }


  async function aiDebugging(code: string) {
    try {
        vscode.window.showInformationMessage("Generating debugging flow diagrams and edge cases...");

        history.push({
            role: "user",
            parts: [{ text: `Analyze the following code and generate:\n- An ASCII art representation of the flow diagram.\n- A list of potential edge cases to consider.\n${code}` }]
        });

        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const result = await model.generateContent({
            contents: history,
        });

        const response = result.response.text();

        if (!response) {
            vscode.window.showErrorMessage("Gemini couldn't generate debugging details.");
            return;
        }

        history.push({
            role: "model",
            parts: [{ text: response }]
        });

        const asciiMatch = response.match(/```[\s\S]*?\n([\s\S]*?)\n```/);
        const asciiDiagram = asciiMatch ? asciiMatch[1].trim() : "No ASCII diagram generated.";
        const remainingText = response.replace(asciiDiagram, "").trim();

        const panel = vscode.window.createWebviewPanel(
            "geminiDebugging",
            "AI Debugging - Flow Diagram & Edge Cases",
            vscode.ViewColumn.Beside,
            { enableScripts: true }
        );

        panel.webview.html = `
            <html>
            <body style="font-family: monospace; padding: 10px; background-color: #1e1e1e; color: #d4d4d4;">
              <h2>Flow Diagram</h2>
              <pre style="background: #252526; padding: 10px; border-radius: 5px; overflow-x: auto;">${asciiDiagram}</pre>
              <h2>Edge Cases</h2>
              <p>${remainingText.replace(/\n/g, "<br>")}</p>
            </body>
            </html>
        `;

    } catch (error) {
        vscode.window.showErrorMessage("Error using Gemini: " + error);
    }
}






  async function autoUnitTestGenerator(code: string) {
    try {
      vscode.window.showInformationMessage("Generating simple unit test cases...");

      const model = genAI.getGenerativeModel({ model: "gemini-pro" });

      const prompt = `Generate simple unit test inputs for the given function.
      Provide only test inputs like:
      - For addition function: "10 20", "50 60", "0 -1", etc.
      - For an array function: "[1,2,3]", "[10,20,30]", "[-1,0,1]"
      - No explanations, only inputs in raw format.

      **Code:**
      \`\`\`js
      ${code}
      \`\`\``;

      const result = await model.generateContent(prompt);
      const response = result.response.text();

      if (!response) {
          vscode.window.showErrorMessage("Gemini couldn't generate test cases.");
          return;
      }

      const testFilePath = path.join(vscode.workspace.rootPath || "", "generatedTestCases.txt");
      fs.writeFileSync(testFilePath, response);

      vscode.window.showInformationMessage("Test cases generated successfully. Open 'generatedTestCases.txt' to view them.");
  } catch (error) {
      vscode.window.showErrorMessage("Error using Gemini: " + error);
  }
  }



  async function autoCI_CDIntegration(code: string) {
    try {
      vscode.window.showInformationMessage("Setting up CI/CD integration...");

      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const result = await model.generateContent(`Provide CI/CD integration steps for the following code:\n${code}`);
      const response = result.response.text();

      if (!response) {
        vscode.window.showErrorMessage("Gemini couldn't set up CI/CD integration.");
        return;
      }

      const document = await vscode.workspace.openTextDocument({
        language: "markdown",
        content: response,
      });

      await vscode.window.showTextDocument(document);
    } catch (error) {
      vscode.window.showErrorMessage("Error using Gemini: " + error);
    }
  }


async function fixCode(editor: vscode.TextEditor, selection: vscode.Selection, code: string) {
  try {
    vscode.window.showInformationMessage("Fixing your code using Gemini...");

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(`  Given the following code, provide the fully corrected version.
  - Keep the original structure.
  - Do not return partial code, return the full corrected version.
- Format the output within triple backticks for easy extraction.\n${code}`);
    const fixedResponse = result.response.text();

    if (!fixedResponse) {
      vscode.window.showErrorMessage("Gemini couldn't fix the code.");
      return;
    }

    const { fixedCode, comments } = extractCodeAndComments(fixedResponse);

    await editor.edit((editBuilder) => {
      if (selection.isEmpty) {
        const fullRange = new vscode.Range(
          editor.document.positionAt(0),
          editor.document.positionAt(editor.document.getText().length)
        );
        editBuilder.replace(fullRange, fixedCode);
      } else {
        editBuilder.replace(selection, fixedCode);
      }
    });

    if (comments) {
      vscode.window.showInformationMessage("Fix applied with comments.");
      await editor.edit((editBuilder) => {
        editBuilder.insert(new vscode.Position(0, 0), `/* ${comments} */\n\n`);
      });
    } else {
      vscode.window.showInformationMessage("Fix applied successfully!");
    }
  } catch (error) {
    vscode.window.showErrorMessage("Error using Gemini: " + error);
  }
}

async function explainError(code: string) {
  try {
    vscode.window.showInformationMessage("Generating error explanation...");

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
	const result = await model.generateContent(`
		Analyze the given code and explain the errors.
		- Clearly state the issues.
		- Provide a solution.
		- Finally, return the fully corrected code in triple backticks so it can be applied directly.
		Code:
		${code}
	  `);
		  const explanation = result.response.text();

    if (!explanation) {
      vscode.window.showErrorMessage("Gemini couldn't explain the errors.");
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "geminiErrorExplanation",
      "Error Explanation",
      vscode.ViewColumn.One,
      { enableScripts: true }
    );

    panel.webview.html = `
      <html>
      <body style="font-family: Arial, sans-serif; padding: 10px;">
        <h2>Error Explanation</h2>
        <p>${explanation.replace(/\n/g, "<br>")}</p>
        <button onclick="fixCode()">Fix Code</button>
        <script>
          const vscode = acquireVsCodeApi();
          function fixCode() {
            vscode.postMessage({ command: "fixCode" });
          }
        </script>
      </body>
      </html>
    `;

    panel.webview.onDidReceiveMessage(
      async (message) => {
        if (message.command === "fixCode") {
          const editor = vscode.window.activeTextEditor;
          if (!editor) return;
          const selection = editor.selection;
          await fixCode(editor, selection, code);
        }
      },
      undefined
    );
  } catch (error) {
    vscode.window.showErrorMessage("Error using Gemini: " + error);
  }
}

function extractCodeAndComments(response: string): { fixedCode: string; comments: string } {
  const codeBlockMatch = response.match(/```[\s\S]*?\n([\s\S]*?)\n```/);
  const fixedCode = codeBlockMatch ? codeBlockMatch[1].trim() : response.trim();

  const comments = response.replace(fixedCode, "").trim();
  return { fixedCode, comments };
}

export function deactivate() {}
