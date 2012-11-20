var awssum = require('awssum');
var amazon = awssum.load('amazon/amazon');
var S3 = awssum.load('amazon/s3').S3;
var config = require("../config").cdn.s3;
var mime = require('mime');
var log = require("phnq_log").create(__filename);

var s3 = null;
var getS3 = function()
{
	if(!s3)
	{
		s3 = new S3(
		{
			"accessKeyId": config.accessKeyId,
			"secretAccessKey": config.secretAccessKey,
			"region": config.region || amazon.US_EAST_1
		});
	}
	return s3;
};

module.exports =
{
	put: function(filename, filedata, fn)
	{
		var dataBuf = new Buffer(filedata, "UTF-8");

		var contentType = mime.lookup(filename);
		var contentEnc = undefined;
		if(filename.match(/\.gz$/))
		{
			contentType = mime.lookup(filename.replace(/\.gz$/, ""));
			contentEnc = "gzip";
		}

		getS3().PutObject(
		{
			BucketName: config.bucketName,
			ObjectName: filename,
			ContentLength: dataBuf.length,
			ContentType: contentType,
			ContentEncoding: contentEnc,
			CacheControl: "public, max-age=315360000",
	        Acl: "public-read",
			Body: dataBuf
		}, function(err)
		{
			if(err)
				return fn(err);

			fn(null);
		});
	},

	getUrlForFile: function(file)
	{
		return "http://"+config.bucketName+".s3.amazonaws.com/"+file;
	}
};