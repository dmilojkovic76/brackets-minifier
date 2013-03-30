/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets, window, document, clearTimeout, setTimeout */

define(function (require, exports, module) {
    "use strict";
    
    var CommandManager   = brackets.getModule("command/CommandManager"),
        Menus            = brackets.getModule("command/Menus"),
        EditorManager    = brackets.getModule("editor/EditorManager"),
        DocumentManager  = brackets.getModule("document/DocumentManager"),
        FileUtils        = brackets.getModule("file/FileUtils"),
        NativeFileSystem = brackets.getModule("file/NativeFileSystem").NativeFileSystem,
        CSSMin           = require("cssmin").CSSMin;
    
    var language = $("#status-language").text(),
        code = "",
        result = "",
        delay,
        auto = false; // default to true
    
    $("#status-indicators").prepend('<div id="min-status" style="text-align: right;"></div>');
    var tunnel = $("#min-status");
    
    function status(msg) {
        tunnel.text(msg);
    }
    
    function save(code, path) {
        var fileEntry = new NativeFileSystem.FileEntry(path), lineEnding = "\n";
        if (FileUtils.getPlatformLineEndings() === "CRLF") {
            lineEnding = "\r\n";
        }
        FileUtils.writeText(fileEntry, code).done(function () {
            console.log("done");
        });
    }
    
    function read(file, lan) {
        var editor = EditorManager.getActiveEditor();
        if (lan === "JavaScript") {
            var data = {
                'compilation_level': 'SIMPLE_OPTIMIZATIONS',
                'output_format': 'text',
                'output_info': 'compiled_code'
            };
            clearTimeout(delay);
            data.js_code = editor.document.getText();
            $.ajax({
                url: 'https://closure-compiler.appspot.com/compile',
                type: 'POST',
                data: data
            }).done(function (mini) {
                var path = file.fullPath.replace(".js", ".min.js");
                save(mini, path);
                status("Minified");
                delay = setTimeout(function () { status(""); }, 1000);
            });
        } else if (lan === "CSS") {
            var mini = CSSMin.go(editor.document.getText());
            var path = file.fullPath.replace(".css", ".min.css");
            save(mini, path);
            status("Minified");
            delay = setTimeout(function () { status(""); }, 1000);
        }
    }
    
    // Function to run when the menu item is clicked
    function compile() {
        status("Minifying...");
        language = $("#status-language").text();
        if (language !== "JavaScript" && language !== "CSS") {
            console.log("Language not JavaScript");
            return;
        } else {
            code = "";
            var editor = EditorManager.getActiveEditor();
            if (!editor) {
                return;
            }
            
            read(editor.document.file, language);
        }
    }
    
    $(DocumentManager).on("documentSaved", function (event, doc) {
        if (auto) {
            var fExt = doc.file.name.split(".").pop();
            
            if (fExt === "js") {
                compile();
            }
        } else {
            return;
        }
    });
    
    var menu = Menus.getMenu(Menus.AppMenuBar.EDIT_MENU);
    var cmd_min_id = "compiler.min";
    var cmd_auto_id = "compiler.auto";
    CommandManager.register("Minify JavaScript", cmd_min_id, compile);
    var automaton = CommandManager.register('Compile on Save', cmd_auto_id, function () {
        this.setChecked(!this.getChecked());
    });
    
    $(automaton).on('checkedStateChange', function () {
        auto = automaton.getChecked();
    });
    
    menu.addMenuItem('compiler.min', "Ctrl-M");
    menu.addMenuItem(automaton);
    menu.addMenuDivider('before', 'compiler.min');
    
    automaton.setChecked(auto);
    console.log(auto);
    
});