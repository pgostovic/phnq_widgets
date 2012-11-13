var awssum = require('awssum');
var amazon = awssum.load('amazon/amazon');
var S3 = awssum.load('amazon/s3').S3;
var config = require("../config");
var mime = require('mime');
var log = require("phnq_log").create(__filename);



config.s3AccessKeyId = "AKIAJTGZE3BFFEVPD7LA";
config.s3SecretAccessKey = "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";
config.s3BucketName = "macmms-agg";



var s3 = null;
var getS3 = function()
{
	if(!s3)
	{
		s3 = new S3(
		{
			"accessKeyId": config.s3AccessKeyId,
			"secretAccessKey": config.s3SecretAccessKey,
			"region": config.s3Region || amazon.US_EAST_1
		});
	}
	return s3;
};

module.exports =
{
	put: function(filename, filedata, fn)
	{
		getS3().PutObject(
		{
			BucketName: config.s3BucketName,
			ObjectName: filename,
			ContentLength: filedata.length,
			ContentType: mime.lookup(filename),
	        Acl: "public-read",
			Body: filedata
		}, function(err)
		{
			if(err)
				return fn(err);

			fn(null);
		});
	}
};







