/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets, window, document, clearTimeout, setTimeout, localStorage */

define(function(require, exports, module) {
    "use strict";

    var CommandManager = brackets.getModule("command/CommandManager"),
        Menus = brackets.getModule("command/Menus"),
        EditorManager = brackets.getModule("editor/EditorManager"),
        DocumentManager = brackets.getModule("document/DocumentManager"),
        FileUtils = brackets.getModule("file/FileUtils"),
        FileSystem = brackets.getModule("filesystem/FileSystem"),
        ProjectManager = brackets.getModule("project/ProjectManager"),
        JSMin = require("vendor/jsmin").JSMin,
        CSSMin = require("vendor/cssmin").CSSMin;

    var language = $("#status-language").text(),
        code = "",
        result = "",
        delay,
        auto = (localStorage["minifier.auto"] === "true");

    if (typeof localStorage["minifier.auto"] === "undefined") {
        auto = false;
        localStorage["minifier.auto"] = false;
    }

    $("#status-indicators").prepend('<div id="min-status" style="text-align: right;"></div>');
    var tunnel = $("#min-status");

    function status(msg) {
        tunnel.text(msg);
    }

    function save(code, path) {
        FileSystem.getFileForPath(path).write(code, {});
    }

    function process(editor, lan) {
        var file = editor.document.file;
        if (file.name.match(new RegExp("\\.min\\." + lan))) {
            status("File already minified");
            delay = setTimeout(function() {
                status("");
            }, 1000);
        } else if (lan === "js") {
            var mini = JSMin.go(editor.document.getText(), 3).replace(/\n/, '');
            var path = file.fullPath.replace(".js", ".min.js");
            save(mini, path);
            status("Minified");
            delay = setTimeout(function() {
                status("");
            }, 1000);
        } else if (lan === "css") {
            var mini = CSSMin.cssmin(editor.document.getText());
            var path = file.fullPath.replace(".css", ".min.css");
            save(mini, path);
            status("Minified");
            delay = setTimeout(function() {
                status("");
            }, 1000);
        } else {
            status("File type not minifiable");
            delay = setTimeout(function() {
                status("");
            }, 1000);
        }
    }

    // Function to run when the menu item is clicked
    function compile() {
        status("Minifying...");
        language = (EditorManager.getActiveEditor()).document.file.name.split('.').pop();
        if (language !== "js" && language !== "css") {
            status("File type not minifiable");
            delay = setTimeout(function() {
                status("");
            }, 3000);
            return;
        } else {
            code = "";
            var editor = EditorManager.getActiveEditor();
            if (!editor) {
                return;
            }

            process(editor, language);
        }
    }

    $(DocumentManager).on("documentSaved", function(event, doc) {
        if (auto) {
            var fExt = doc.file.name.split(".").pop();

            if (fExt === "js" || fExt === "css") {
                compile();
            }
        } else {
            status("File type not minifiable");
            return;
        }
    });

    var menu = Menus.getMenu(Menus.AppMenuBar.EDIT_MENU);
    var cmd_min_id = "minifier.min";
    var cmd_auto_id = "minifier.auto";
    CommandManager.register("Minify", cmd_min_id, compile);
    CommandManager.register("Minify on Save", cmd_auto_id, function() {
        this.setChecked(!this.getChecked());
    });

    var automaton = CommandManager.get(cmd_auto_id);
    automaton.setChecked(auto);

    $(automaton).on('checkedStateChange', function() {
        auto = automaton.getChecked();
        localStorage["minifier.auto"] = auto;
    });

    menu.addMenuItem('minifier.min', "Ctrl-M");
    menu.addMenuItem(automaton);
    menu.addMenuDivider('before', 'minifier.min');

    automaton.setChecked(auto);
});