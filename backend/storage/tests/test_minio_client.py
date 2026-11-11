from unittest.mock import MagicMock

from django.test import SimpleTestCase

from storage.clients.minio_client import MinioObjectStream, MinioStorageBackend


class MinioStorageBackendTests(SimpleTestCase):
    def setUp(self):
        self.backend = MinioStorageBackend(
            endpoint="localhost:9000",
            access_key="fake-access-key",
            secret_key="fake-secret-key",
            bucket_name="test-bucket",
        )
        self.client = MagicMock()
        self.response = MagicMock()
        self.backend._client = self.client
        self.client.get_object.return_value = self.response

    def test_download_reads_object_in_chunks_and_releases_connection(self):
        self.response.read.side_effect = [b"first", b"second", b""]

        stream = self.backend.download_object("object-key")

        self.assertEqual(list(stream), [b"first", b"second"])
        self.assertEqual(
            [call.args for call in self.response.read.call_args_list],
            [
                (MinioObjectStream.CHUNK_SIZE,),
                (MinioObjectStream.CHUNK_SIZE,),
                (MinioObjectStream.CHUNK_SIZE,),
            ],
        )
        self.response.close.assert_called_once_with()
        self.response.release_conn.assert_called_once_with()

    def test_closing_unread_download_releases_connection(self):
        stream = self.backend.download_object("object-key")

        stream.close()

        self.response.read.assert_not_called()
        self.response.close.assert_called_once_with()
        self.response.release_conn.assert_called_once_with()
