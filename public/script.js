// 
function notify(message, customOpts) 
{
    var opts = 
    {
        type: 'info',
        placement: 
        {
            from: "top",
            align: "center"
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

function onLoad () 
{
    console.log('Page loaded');
    var notification = Cookies.get('notification')
    if (notification) 
    {
        console.log('notification: ' + notification)
        notify(notification)
        Cookies.remove('notification')
    }
}

function doCreateFolder () 
{
    bootbox.prompt('Create Folder', function (result)
    {
        if (result)
        {
            var dbx = new Dropbox({ accessToken: token })
            notify('Creating folder: ' + result )
            dbx.filesCreateFolder({ path: path + '/' + result }).then(function (response)
            {
                console.log('Created folder:', response)
                Cookies.set('notification', 'Created folder: ' + result)
                window.location.reload(true)
            })
            .catch(function(error) 
            {
                console.error(error)
            })
        }
    })
}

function doUploadFile ()
{
    // !!!
    bootbox.alert('Upload File')
}

function doRename () 
{
    var selections = $('#filesTable').bootstrapTable('getSelections')
    var type = "file"
    if (selections[0]._data.isfolder) 
    {
        type = 'folder'
    }
    message = 'Rename ' + type + ': "' + selections[0]._data.name + '" to:'

    bootbox.prompt(message, function (result)
    {
        var src = selections[0]._data.path
        var dst = path + result
        console.log("Rename " + src + " to " + dst)
        var dbx = new Dropbox({ accessToken: token })
        dbx.filesMove({ from_path: src, to_path: dst })
        .then(function(response) 
        {
            console.log('Entry renamed:', response)
            Cookies.set('notification', 'Renamed ' + type + ': ' + selections[0]._data.name + " to " + result)
            window.location.reload(true)
        })
        .catch(function(error) 
        {
            console.error(error)
        })
    })
}

function doMove () 
{
    $('#moveCopyModalTitle').text("Move")
    $('#moveCopyModal').modal()

    $('#moveCopyModalOk').click(function (e) 
    {
        console.log("User clicked OK")
        $('#moveCopyModal').modal('hide')
    })
}

function doCopy () 
{
    // !!!
    bootbox.alert('Copy')
}

function doDelete () 
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
            var dbx = new Dropbox({ accessToken: token })
            if (selections.length === 1) 
            {
                // Single item operation (interactive)
                //
                notify('Deleting ' + type + ': ' + selections[0]._data.name);
                dbx.filesDelete({ path: selections[0]._data.path })
                .then(function(response) 
                {
                    console.log('Entry deleted:', response)
                    Cookies.set('notification', 'Deleted ' + type + ': ' + selections[0]._data.name)
                    window.location.reload(true)
                })
                .catch(function(error) 
                {
                    console.error(error)
                })
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

                console.log('Delete entries:', entries)

                dbx.filesDeleteBatch({ entries: entries }).then(function (response) 
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
                                    Cookies.set('notification", "Deleted selected entries')
                                    window.location.reload(true)
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
        }
    })
}
