// 
function doCreateFolder () {
  bootbox.prompt("Create Folder", function (result) {
    if (result) {
      var dbx = new Dropbox({ accessToken: token })
      dbx.filesCreateFolder({ path: path + '/' + result })
      .then(function(response) {
        console.log("Created folder:", response)
        window.location.reload(true)
      })
      .catch(function(error) {
        console.error(error)
      })
    }
  })
}

function doUploadFile () {
  bootbox.alert("Upload File")
}

function doRename () {
  bootbox.alert("Rename")
}

function doMove () {
  bootbox.alert("Move")
}

function doCopy () {
  bootbox.alert("Copy")
}

function doDelete () {
  bootbox.alert("Delete")
}
