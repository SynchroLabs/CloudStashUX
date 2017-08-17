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

    $('#files').on('change', uploadFile)

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

// For streaming/multipart upload (from Node.js app), see - https://github.com/AlesMenzel/dropbox-session-test
//
function uploadFile ()
{
    var files = $('#files')[0].files
    console.log("Files: %o", files)

    notify('Uploading file: ' + files[0].name);

    // filesUpload internally uses a SuperAgent request and does a send() on 'contents', which apparently
    // works on these browser form file objects.
    //
    dbx.filesUpload({ path: path + '/' + files[0].name, contents: files[0] }).then(function(response) 
    {
        console.log(response);
        reloadAndNotify('Completed uploading of file: ' + files[0].name)
    })
    .catch(function(error) 
    {
        console.error(error);
    });
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

        dbx.filesMove({ from_path: src, to_path: dst })
        .then(function(response) 
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

function onMove () 
{
    jQuery.data($('#moveCopyModal')[0], 'operation', 'move')
    $('#moveCopyModalDest').val('')
    $('#moveCopyModalTitle').text('Move')
    $('#moveCopyModal').modal()
}

function onCopy () 
{
    jQuery.data($('#moveCopyModal')[0], 'operation', 'copy')
    $('#moveCopyModalDest').val('')
    $('#moveCopyModalTitle').text('Copy')
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
    dbx.filesDelete({ path: selections[0]._data.path })
    .then(function(response) 
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
