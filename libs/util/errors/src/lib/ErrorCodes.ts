export const ERROR_CODES: Record<string, { summary: string; help: string }> = {
  META0003: {
    summary: 'Cannot reach the service endpoint to execute discovery',
    help: `
Cannot reach the service endpoint to execute discovery. Make sure:

* The provided \`URI\`/\`ARN\` is correct
* The deployment is up and running
* Restate can reach the deployment through the configured \`URI\`/\`ARN\`
* If additional authentication is required, make sure it's configured through \`additional_headers\``,
  },
  META0004: {
    summary:
      'Cannot register the provided deployment, because it conflicts with the uri of an already registered deployment.',
    help: `Cannot register the provided deployment, because it conflicts with the uri of an already registered deployment.

In Restate deployments have a unique uri/arn and are immutable, thus it's not possible to discover the same deployment twice. 
Make sure, when updating a deployment, to assign it a new uri/arn. 

You can force the override using the \`"force": true\` field in the discover request, but beware that this can lead in-flight invocations to an unrecoverable error state.  

See the [versioning documentation](https://docs.restate.dev/services/versioning) for more information.`,
  },
  META0005: {
    summary:
      'Cannot propagate deployment/service metadata to Restate services.',
    help: `Cannot propagate deployment/service metadata to Restate services. If you see this error when starting Restate, this might indicate a corrupted Meta storage.

We recommend wiping the Meta storage and recreating it by registering deployments in the same order they were registered before.`,
  },
  META0006: {
    summary:
      'Cannot register the newly discovered service revision in the provided deployment, because it conflicts with an already existing service revision.',
    help: `Cannot register the newly discovered service revision in the provided deployment, because it conflicts with an already existing service revision.

When implementing a new service revision, make sure that:

* The service type is the same as the previous revision.
* The new revision contains at least all the handlers of the previous revision.

See the [versioning documentation](https://docs.restate.dev/services/versioning) for more information.`,
  },
  META0009: {
    summary: 'The provided subscription is invalid.',
    help: `The provided subscription is invalid. Subscriptions should have:

* A \`source\` field in the format of \`kafka://<CLUSTER_NAME>/<TOPIC_NAME>\`. When registering, the Kafka cluster should be configured in the Restate configuration.
* A \`sink\` field in the format of \`service://<service_NAME>/<HANDLER_NAME>\`. When registering, service and handler should be available already in the registry, meaning they have been previously registered.
* Additional constraints may apply depending on the sink service type.

Please look at the Kafka [documentation](https://docs.restate.dev/guides/kafka-quickstart#restate-kafka-quickstart) for more details on subscriptions and event handlers.`,
  },
  META0010: {
    summary:
      'Trying to open meta storage directory, configured via `meta.storage_path`, which contains incompatible data.',
    help: `Trying to open meta storage directory, configured via \`meta.storage_path\`, which contains incompatible data. This indicates that your data was written with a different Restate version than you are running right now.

Suggestions:

* Up/Downgrade your Restate server to the requested version.
* Migrate your data to the requested version by running the migration scripts.
* Wipe your meta storage directory to start afresh via \`rm -rf <BASE_DIR>/<NODE_NAME>/local-metadata-store\`.
* Configure a different meta storage directory via \`meta.storage_path\`.`,
  },
  META0011: {
    summary:
      'Non-empty meta storage directory, configured via `meta.storage_path`, is missing the version file.',
    help: `Non-empty meta storage directory, configured via \`meta.storage_path\`, is missing the version file. This indicates data corruption or that the data has been written with an incompatible Restate version < 0.8.

Suggestions:

* Wipe your meta storage directory to start afresh via \`rm -rf <BASE_DIR>/<NODE_NAME>/local-metadata-store\`.
* Configure a different meta storage directory via \`meta.storage_path\`.
* Downgrade your Restate server to {'<='} 0.7.`,
  },
  META0012: {
    summary:
      'Trying to register a service endpoint whose supported service protocol versions is incompatible with the server.',
    help: `Trying to register a service endpoint whose supported service protocol versions is incompatible with the server. This indicates that you have to upgrade your server to make it work together with the deployed SDK.

Suggestions:

* Check the compatibility matrix between SDK and server versions
  * Try upgrading to a server version which is compatible with your SDK
  * Try using an SDK version which is compatible with your server`,
  },
  META0013: {
    summary:
      'Received a bad service discovery response from the specified service endpoint.',
    help: `Received a bad service discovery response from the specified service endpoint. This indicates that you are trying to register a service endpoint with an incompatible server. 

Suggestions:

* Check the compatibility matrix between SDK and server versions
  * Either deploy a server version which is compatible with your SDK
  * Or use an SDK version which is compatible with your server`,
  },
  META0014: {
    summary:
      'Service discovery response failed, and the server may have responded in HTTP1.1.',
    help: `Service discovery response failed, and the server may have responded in HTTP1.1.
This can happen when discovering locally running dev servers from Faas platforms
eg \`wrangler dev\`. FaaS platforms in generally will support HTTP2, however, so
this is only a local development concern.

You can try to discover the endpoint with \`--use-http1.1\` when working
with these local dev servers. This should not be needed in production.`,
  },
  META0015: {
    summary: `The service discovery response suggested that the SDK is serving in
bidirectional protocol mode, but discovery is going over a protocol that does
not support it (currently only Lambda).`,
    help: `The service discovery response suggested that the SDK is serving in
bidirectional protocol mode, but discovery is going over a protocol that does
not support it (currently only Lambda).

Lambda endpoints do not support the bidirectional protocol mode and should be
configured to announce themselves as being in request-response mode upon
discovery.`,
  },
  RT0001: {
    summary:
      'The invocation response stream was aborted due to the timeout configured in `worker.invoker.abort_timeout`.',
    help: `The invocation response stream was aborted due to the timeout configured in \`worker.invoker.abort_timeout\`.
This timeout is fired when Restate has an open invocation, and it's waiting only for response messages, but no message is seen for the configured time.

Suggestions:

* Check for bugs in your code. Most likely no message was sent to Restate because your code is blocked and/or reached a deadlock.
* If your code is supposed to not send any message to Restate for longer than the configured timeout, because for example is doing a blocking operation that takes a long time, change the configuration accordingly.`,
  },
  RT0002: {
    summary: 'Cannot start Restate because the configuration cannot be parsed.',
    help: `Cannot start Restate because the configuration cannot be parsed. Check the configuration file and the environment variables provided.

For a complete list of configuration options, and a sample configuration, check https://docs.restate.dev/references/server-config`,
  },
  RT0003: {
    summary:
      'The invocation failed because Restate received a message from a service larger than the `worker.invoker.message_size_limit`.',
    help: `The invocation failed because Restate received a message from a service larger than the \`worker.invoker.message_size_limit\`.

Suggestions:

* Check in your code whether there is a case where a very large message can be generated, such as a state entry being too large, a request payload being too large, etc.
* Increase the limit by tuning the \`worker.invoker.message_size_limit\` config entry, eventually tuning the memory of your operating system/machine where Restate is running.`,
  },
  RT0004: {
    summary:
      'Failed starting process because it could not bind to configured address.',
    help: `Failed starting process because it could not bind to configured address.
This happens usually if another process has already bound to this address.

Suggestions:

* Select an address that is free.
* Stop the process that has bound to the specified address.
* Make sure you have the permissions to bind to the configured port. Some operating systems require admin/root privileges to bind to ports lower than 1024.`,
  },
  RT0005: {
    summary: 'Failed opening RocksDB, because the db file is currently locked.',
    help: `Failed opening RocksDB, because the db file is currently locked.  
This happens usually if another process still holds the lock.

Suggestions:

* Check no other Restate process is running and using the same db file.
* Configure a different RocksDB storage directory via \`worker.storage_rocksdb.path\`.`,
  },
  RT0006: {
    summary: 'A generic error occurred while invoking the service.',
    help: `A generic error occurred while invoking the service.
We suggest checking the service/deployment logs as well to get any hint on the error cause.`,
  },
  RT0007: {
    summary:
      'A retry-able error was received from the service while processing the invocation.',
    help: `A retry-able error was received from the service while processing the invocation. Restate will soon retry executing the invocation, replaying from the point where it left. Suggestions:

* Check the service logs to get more info about the error cause, like the stacktrace.
* Look at the [error handling docs](https://docs.restate.dev/guides/error-handling#error-handling) for more info about error handling in services.`,
  },
  RT0009: {
    summary:
      'Trying to open worker storage directory, configured via `worker.storage_rocksdb.path`, which contains no storage format version information.',
    help: `Trying to open worker storage directory, configured via \`worker.storage_rocksdb.path\`, which contains no storage format version information. This indicates data corruption or that the data has been written with an incompatible Restate version < 0.8.

Suggestions:

* Wipe your meta storage directory to start afresh via \`rm -rf <BASE_DIR>/<NODE_NAME>/db\`.
* Configure a different worker storage directory via \`worker.storage_rocksdb.path\`.
* Downgrade your Restate server to < 0.8.`,
  },
  RT0010: {
    summary: 'Network error when interacting with the service endpoint.',
    help: `Network error when interacting with the service endpoint. This can be caused by a variety of reasons including:

* The service is (temporarily) down
* The service is (temporarily) not reachable over the network
* Your network security setup blocks Restate from reaching the service
* A config error where the registered service endpoint and the actually deployed service endpoint differ`,
  },
  RT0011: {
    summary: 'No deployment found for the given service. ',
    help: `No deployment found for the given service. 
This might indicate that the service and/or the associated deployment was removed from the schema registry before starting to process the invocation. 
Check whether the deployment still exists.`,
  },
  RT0012: {
    summary: 'Protocol violation error.',
    help: `Protocol violation error. This can be caused by an incompatible runtime and SDK version, or by an SDK bug. If the error persists, please file a [bug report](https://github.com/restatedev/restate/issues). `,
  },
  RT0013: {
    summary:
      'The service endpoint does not support any of the supported service protocol versions of the server.',
    help: `The service endpoint does not support any of the supported service protocol versions of the server. Please make sure that the service endpoint's SDK and the Restate server are compatible.

Suggestions:

* Register a service endpoint which uses an SDK which is compatible with the used server
* Upgrade the server to a version which is compatible with the used SDK`,
  },
  RT0014: {
    summary:
      'The server cannot resume an in-flight invocation which has been started with a now incompatible service protocol version.',
    help: `The server cannot resume an in-flight invocation which has been started with a now incompatible service protocol version. Restate does not support upgrading service protocols yet.

Suggestions:

* Downgrade the server to a version which is compatible with the used service protocol version
* Kill the affected invocation via the CLI.`,
  },
  RT0015: {
    summary: `The server can't establish an invocation stream because the SDK does not support the service protocol version negotiated during discovery.`,
    help: `The server can't establish an invocation stream because the SDK does not support the service protocol version negotiated during discovery.

This indicates that the SDK was updated to a new version that dropped support for old service protocol versions, but no re-registration was performed.  

Suggestions:

* For in-flight invocations, downgrade the SDK version back to the previous version.
* For new invocations, register a new deployment with a new endpoint as described in [here](https://docs.restate.dev/services/versioning#deploying-new-service-versions).  
* Make sure the new SDK is compatible with this runtime version, for more info check out [here](https://docs.restate.dev/server/upgrading#service-compatibility).`,
  },
  RT0016: {
    summary: `Journal mismatch detected when replaying the invocation: the handler generated a sequence of journal entries (thus context operations) that doesn't exactly match the recorded journal.`,
    help: `Journal mismatch detected when replaying the invocation: the handler generated a sequence of journal entries (thus context operations) that doesn't exactly match the recorded journal. This indicates that either the service code was changed (e.g. the service container image updated) without registering a new version of the service deployment, or some code within the handler is non-deterministic. Some common mistakes that lead to non-deterministic errors are:
    
* Branch the execution flow based on some non-deterministic information, such as the elapsed time between now and another timestamp, or the result of an HTTP request that was not recorded using the \`ctx.run\` feature.
* A parameter passed to a \`Context\` operation is non-deterministic, for example setting a state key using a random value or the current date-time.
* Execute a sequence of \`Context\` operations, such as calling other services, while iterating over a data structure with non-deterministic iteration order (such as sets/maps/dictionaries).
    
For more info about service versioning, check out [here](https://docs.restate.dev/services/versioning).
For more info about determinism and journaling of non-deterministic operations, check out [here](https://docs.restate.dev/foundations/actions#actions).`,
  },
  RT0017: {
    summary: `The entry cannot be processed due to a failed precondition.`,
    help: `The entry cannot be processed due to a failed precondition. This entry, and all the subsequent received entries, have been discarded and Restate will retry executing the invocation from the last recorded entry.
    
Entry preconditions are usually checked by the SDK. If the error persists, please file a bug report [here](https://github.com/restatedev/restate/issues).`,
  },
  RT0018: {
    summary: `The request submitted through the \`Context\` API to the given service handler cannot be processed, because the service handler doesn't exist.`,
    help: `The request submitted through the \`Context\` API to the given service handler cannot be processed, because the service handler doesn't exist.
    
Make sure the service/handler is registered:

* If the service/handler is correctly registered, you can ignore this error as it's a transient error, due to internal propagation of the cluster metadata.
* If the service/handler is not registered, you must register it in order for this invocation to progress.`,
  },
};
