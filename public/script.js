// 
function notify(message, customOpts) 
{
    var opts = 
    {
        type: 'info',
        placement: 
        {
            from: 'top',
            align: 'center'
        },
        animate: 
        {
            enter: 'animated fadeInDown',
            exit: 'animated fadeOutUp'
        }
    }

    if (customOpts) 
    {
        Object.assign(opts, customOpts)
    }

    $.notify(message, opts)
}

function reloadAndNotify(message)
{
    Cookies.set('notification', message)
    window.location.reload(true)
}

function onLoad () 
{
    console.log('Page loaded, path: "%s"', path);
    var notification = Cookies.get('notification')
    if (notification) 
    {
        console.log('notification: ' + notification)
        notify(notification)
        Cookies.remove('notification')
    }

    $('#moveCopyModalOk').click(function (e) 
    {
        onMoveCopyOk()
    })

    $('#search').on('keydown', function (event)
    {
        if (event.keyCode === 13)
        {
            event.preventDefault()
            onSearch($('#search').val())
            return false
        }
    }) 

    $('#searchButton').click(function (e) 
    {
        onSearch($('#search').val())
    })

    $('#files').on('change', function()
    {
        // The form field returns a FileList object, which has the same functionality as an array, 
        // but is not an array, so we have to convert it to one...
        //
        var fileList = $('#files')[0].files
        var files = []
        for (var i = 0; i < fileList.length; i++)
        {
            files.push(fileList[i])
        }
        uploadFiles(files)
    })

    $('#filesTable').show();

    // Update initial command state
    //
    selectionChanged()
}

function selectionChanged () 
{
    var selections = $('#filesTable').bootstrapTable('getSelections')
    console.log("Selection changed, selection count: " + selections.length)
    selections.forEach(function(element)
    {
        console.log("Selection: " + element._data.path)
    })

    if (selections.length == 0)
    {
        $('#btnCreateFolder').show()
        $('#btnUploadFile').show()
        $('#btnRename').hide()
        $('#btnMove').hide()
        $('#btnCopy').hide()
        $('#btnDelete').hide()
    }
    else if (selections.length == 1)
    {
        $('#btnCreateFolder').hide()
        $('#btnUploadFile').hide()
        $('#btnRename').show()
        $('#btnMove').show()
        $('#btnCopy').show()
        $('#btnDelete').show()
    }
    else
    {
        $('#btnCreateFolder').hide()
        $('#btnUploadFile').hide()
        $('#btnRename').hide()
        $('#btnMove').show()
        $('#btnCopy').show()
        $('#btnDelete').show()
    }
}

function onSearch (query)
{
    console.log("Search for:", query)
    window.location.href = '/search?query=' + encodeURIComponent(query)
}

function onCreateFolder () 
{
    bootbox.prompt('Create Folder', function (result)
    {
        if (result)
        {
            notify('Creating folder: ' + result )
            dbx.filesCreateFolder({ path: path + '/' + result }).then(function (response)
            {
                console.log('Created folder:', response)
                reloadAndNotify('Created folder: ' + result)
            })
            .catch(function(error) 
            {
                console.error(error)
            })
        }
    })
}

function onUploadFile ()
{
    $('#files').click();
}

// File(s) upload
//
// The Dropbox JavaScript API uses SuperAgent internally, and SuperAgent in turns uses the XMLHttpReuest (XHR).
// That internal XHR has progress notification (and cancel) support, but it is not exposed to us here (the
// Dropbox JavaScript API doesn't even have access to it).  So there does not appear to be a way to get status
// or to cancel a Dropbox upload via the Dropbox JavaScript API.
//
// That being said, we could report status and support cancel on multipart upload, or a multi-file upload (probably
// easier and more sensible if we did them serially).
//
const maxBlob = 8 * 1024 * 1024 // 8Mb - Dropbox JavaScript API suggested max file / chunk size

function uploadFile (file)
{
    notify('Uploading file: ' + file.name);

    if (file.size > maxBlob)
    {
        // !!! Multipart upload - use filesUploadSession APIs
        //
        // We can slice the file into chunks for upload, using the HTML5 files APIs:
        // https://www.html5rocks.com/en/tutorials/file/dndfiles/
        //
        // Here is an example multipart upload using the Dropbox JS API: 
        // https://github.com/AlesMenzel/dropbox-session-test
        //
    }
    else
    {
        // !!! Straight filesUpload
    }

    // !!! For now we're just going to do fileUpload on all files (should work for size < 150Mb)
    //
    dbx.filesUpload({ path: path + '/' + file.name, contents: file }).then(function(response) 
    {
        console.log(response);
        reloadAndNotify('Completed uploading of file: ' + file.name)
    })
    .catch(function(error) 
    {
        console.error(error);
    });
}

function uploadFiles (files)
{
    console.log("Upload files: %o", files)

    if (files.length === 1)
    {
        // Single file upload
        //
        uploadFile(files[0])
    }
    else
    {
        // Multiple file upload 
        //
        // We could use this logic for both cases, but the idea is that we'll want some kind of status with
        // cancel on multi-file uploads.  And we'll probably want to do them serially, or at least with a 
        // reasonable parallel concurrency.
        //
        files.forEach(function(file) 
        {
            uploadFile(file)
        })
    }
}

function onRename () 
{
    var selections = $('#filesTable').bootstrapTable('getSelections')
    var type = 'file'
    if (selections[0]._data.isfolder) 
    {
        type = 'folder'
    }
    message = 'Rename ' + type + ': "' + selections[0]._data.name + '" to:'

    bootbox.prompt(message, function (result)
    {
        var src = selections[0]._data.path
        var dst = path + '/' + result
        console.log('Rename ' + src + ' to ' + dst)

        dbx.filesMove({ from_path: src, to_path: dst }).then(function(response) 
        {
            console.log('Entry renamed:', response)
            reloadAndNotify('Renamed ' + type + ': ' + selections[0]._data.name + ' to ' + result)
        })
        .catch(function(error) 
        {
            console.error(error)
        })
    })
}

function populateFolder (parentPath, parentId, depth)
{
    depth--

    dbx.filesListFolder({ path: parentPath, recursive: false }).then(function(response) 
    {
        console.log('Folder list:', response)
        response.entries.forEach(function(entry)
        {
            if (entry['.tag'] === 'folder')
            {
                console.log("Found folder:", entry.name)
                var node = $('#tree').treeview('addNode', [parentId, { text: entry.name, path: entry.path_display }])
                if (node.nodeId === 1)
                {
                    // This is kind of a hack, but once we've added the first non-root node (nodeId == 1), we
                    // need to expand the root node (nodeId == 0).
                    //
                    $('#tree').treeview('expandNode', [ 0, { levels: 2, silent: true } ]);
                }

                if (depth)
                {
                    populateFolder(node.path, node.nodeId, depth)
                }
            }

            var parentNode = $('#tree').treeview('getNode', [parentId]);
            parentNode.populated = true
        })
    })
    .catch(function(error) 
    {
        console.error(error)
    })
}

function populateFolderPicker ()
{
    var tree = [
    {
        text: "Home",
        path: "/",
    }]

    var tree = $('#tree').treeview(
    {
        data: tree,
        nodeIcon: "glyphicon glyphicon-folder-close"
    })

    tree.on('nodeSelected', function (event, node)
    {
        console.log("Node selected:", node)
        $('#moveCopyModalDest').val(node.path)
    })

    tree.on('nodeExpanded', function (event, node)
    {
        // The idea here is the if we have only populated to a certain depth, then
        // when we expand a node, we need to ensure that its children have been
        // populated (so that its children will show expandability appropriately).
        //
        console.log("Node expanded:", node)
        node.nodes.forEach(function (childNode)
        {
            if (!childNode.populated)
            {
                populateFolder(childNode.path, childNode.nodeId, 1)
            }
        })
    })

    populateFolder('', 0, 2)
}

function onMove () 
{
    jQuery.data($('#moveCopyModal')[0], 'operation', 'move')
    $('#moveCopyModalTitle').text('Move')
    $('#moveCopyModalDest').val('')
    populateFolderPicker()
    $('#moveCopyModal').modal()
}

function onCopy () 
{
    jQuery.data($('#moveCopyModal')[0], 'operation', 'copy')
    $('#moveCopyModalTitle').text('Copy')
    $('#moveCopyModalDest').val('')
    populateFolderPicker()
    $('#moveCopyModal').modal()
}

function moveFile (params, successMessage)
{
    dbx.filesMove(params)
    .then(function(response) 
    {
        console.log('File moved:', response)
        reloadAndNotify(successMessage)
    })
    .catch(function(error) 
    {
        console.error(error)
    })
}

function moveFiles (params)
{
    console.log('Moving entries:', params.entries)

    dbx.filesMoveBatch(params).then(function (response) 
    {
        console.log('Batch move underway:', response)

        if (response['.tag'] === 'async_job_id') 
        {
            (function pollForJobCompletion() 
            {
                console.log('Polling for move batch completion')
                dbx.filesDeleteBatchCheck({ async_job_id: response.async_job_id}).then(function (response) 
                {
                    console.log('Got response to checking batch move completion:', response)
                    if (response['.tag'] === 'complete') 
                    {
                        console.log('Batch move complete:', response)
                        reloadAndNotify('Moved selected entries')
                    } 
                    else if (response['.tag'] === 'in_progress')
                    {
                        setTimeout(pollForJobCompletion, 1000)
                    }
                    else 
                    {
                        console.log('Batch job failed:', response)
                    }
                })
            }())
        }
        else 
        {
          console.log('Error starting batch move:', response)
        }
    })
    .catch(function(error) 
    {
        console.error(error)
    })
}

function copyFile (params, successMessage)
{
    dbx.filesCopy(params)
    .then(function(response) 
    {
        console.log('File copied:', response)
        reloadAndNotify(successMessage)
    })
    .catch(function(error) 
    {
        console.error(error)
    })

}

function copyFiles (params)
{
    console.log('Copying entries:', params.entries)

    dbx.filesCopyBatch(params).then(function (response) 
    {
        console.log('Batch copy underway:', response)

        if (response['.tag'] === 'async_job_id') 
        {
            (function pollForJobCompletion() 
            {
                console.log('Polling for copy batch completion')
                dbx.filesCopyBatchCheck({ async_job_id: response.async_job_id}).then(function (response) 
                {
                    console.log('Got response to checking batch copy completion:', response)
                    if (response['.tag'] === 'complete') 
                    {
                        console.log('Batch copy complete:', response)
                        reloadAndNotify('Copied selected entries')
                    } 
                    else if (response['.tag'] === 'in_progress')
                    {
                        setTimeout(pollForJobCompletion, 1000)
                    }
                    else 
                    {
                        console.log('Batch job failed:', response)
                    }
                })
            }())
        }
        else 
        {
          console.log('Error starting batch copy:', response)
        }
    })
    .catch(function(error) 
    {
        console.error(error)
    })
}

function deleteFile (params, successMessage)
{
    dbx.filesDelete(params).then(function(response) 
    {
        console.log('Entry deleted:', response)
        reloadAndNotify(successMessage)
    })
    .catch(function(error) 
    {
        console.error(error)
    })
}

function deleteFiles (params)
{
    console.log('Delete entries:', params.entries)

    dbx.filesDeleteBatch(params).then(function (response) 
    {
        console.log('Batch deletion underway:', response)

        if (response['.tag'] === 'async_job_id') 
        {
            (function pollForJobCompletion() 
            {
                console.log('Polling for delete batch completion')
                dbx.filesDeleteBatchCheck({ async_job_id: response.async_job_id}).then(function (response) 
                {
                    console.log('Got response to checking batch delete completion:', response)
                    if (response['.tag'] === 'complete') 
                    {
                        console.log('Batch deletion complete:', response)
                        reloadAndNotify('Deleted selected entries')
                    } 
                    else if (response['.tag'] === 'in_progress')
                    {
                        setTimeout(pollForJobCompletion, 1000)
                    }
                    else 
                    {
                        console.log('Batch job failed:', response)
                    }
                })
            }())
        }
        else 
        {
          console.log('Error starting batch delete:', response)
        }
    })
    .catch(function(error) 
    {
        console.error(error)
    })
}

function onMoveCopyOk ()
{
    var operation = jQuery.data($('#moveCopyModal')[0], 'operation')
    var dest = $('#moveCopyModalDest').val()
    console.log('User clicked OK, operation is %s, dest is:', operation, dest)
    $('#moveCopyModal').modal('hide')
    if (!dest)
    {
        console.log("No destination entered, %s operation not completed", operation)
        return
    }

    var action = (operation === 'move' ? "Moving" : "Copying")
    var completedAction = (operation === 'move' ? "Moved" : "Copied")

    var selections = $('#filesTable').bootstrapTable('getSelections')
    if (selections.length === 1) 
    {
        // Single item operation (interactive)
        //
        var params = { from_path: selections[0]._data.path, to_path: dest + "/" + selections[0]._data.name }
        console.log("Do interactive %s with params: %o", operation, params);

        var type = (selections[0]._data.isfolder ? 'folder' : 'file') 
        notify(action + ' ' + type + ': ' + selections[0]._data.name);

        if (operation === 'move')
        {
            moveFile(params, completedAction + ' ' + type + ': ' + selections[0]._data.name)
        }
        else
        {
            copyFile(params, completedAction + ' ' + type + ': ' + selections[0]._data.name)
        }
    }
    else
    {
        // Multi-item operation (batch)
        //
        var entries = []

        selections.forEach(function(element) 
        {
            entries.push({ from_path: element._data.path, to_path: dest + "/" + element._data.name })
        })

        var params = { entries: entries }
        console.log("Do bulk %s with params: %o", operation, params);

        notify(action + ' selected entries');

        if (operation === 'move')
        {
            moveFiles(params)
        }
        else
        {
            copyFiles(params)
        }
    }
}

function onDelete () 
{
    var selections = $('#filesTable').bootstrapTable('getSelections')
    var message = 'Delete selected entries?'
    var type = 'entries'

    if (selections.length == 1) 
    {
        if (selections[0]._data.isfolder) 
        {
            type = 'folder'
        }
        else 
        {
            type = 'file'
        }
        message = 'Delete ' + type + ': "' + selections[0]._data.name + '" ?'
    }

    bootbox.confirm(message, function (result) 
    {
        console.log('Delete confirm result: ' + result)
        if (result) 
        {
            if (selections.length === 1) 
            {
                // Single item operation (interactive)
                //
                notify('Deleting ' + type + ': ' + selections[0]._data.name);

                var params = { path: selections[0]._data.path }
                deleteFile(params, 'Deleted ' + type + ': ' + selections[0]._data.name);
            }
            else 
            {
                // Multi-item operation (batch)
                //
                notify('Deleting selected entries')
                var entries = []

                selections.forEach(function(element) 
                {
                    entries.push({ path: element._data.path })
                })

                var params = { entries: entries }
                deleteFiles(params)
            }
        }
    })
}

//
// Drag / drop support
//

// Note: We probably want to prevent drop altogether on search results page, see:
//       https://stackoverflow.com/questions/6756583/prevent-browser-from-loading-a-drag-and-dropped-file
//

function drop_handler(ev) 
{
    console.log("Drop")
    ev.preventDefault()

    var files = []

    // If dropped items aren't files, reject them
    var dt = ev.dataTransfer
    if (dt.items) 
    {
        // Use DataTransferItemList interface to access the file(s)
        for (var i=0; i < dt.items.length; i++) 
        {
            if (dt.items[i].kind == "file")
            {
                var f = dt.items[i].getAsFile();
                console.log("... file[" + i + "].name = " + f.name)
                files.push(f)
            }
        }
    }
    else
    {
        // Use DataTransfer interface to access the file(s)
        for (var i=0; i < dt.files.length; i++)
        {
            console.log("... file[" + i + "].name = " + dt.files[i].name)
            files.push(f)
        }
    }

    if (files.length)
    {
        console.log("Uploading dropped files:", files)
        uploadFiles(files)
    }
}

function dragover_handler(ev)
{
    console.log("dragOver")

    // Prevent default select and drag behavior
    ev.preventDefault()
}

function dragend_handler(ev)
{
    console.log("dragEnd")

    // Remove all of the drag data
    var dt = ev.dataTransfer
    if (dt.items)
    {
        // Use DataTransferItemList interface to remove the drag data
        for (var i = 0; i < dt.items.length; i++)
        {
            dt.items.remove(i)
        }
    }
    else
    {
        // Use DataTransfer interface to remove the drag data
        ev.dataTransfer.clearData()
    }
}
