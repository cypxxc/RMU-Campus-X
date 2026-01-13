# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `example`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

**If you're looking for the `React README`, you can find it at [`dataconnect-generated/react/README.md`](./react/README.md)**

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*GetPublicMovieLists*](#getpublicmovielists)
  - [*GetMoviesInMovieList*](#getmoviesinmovielist)
- [**Mutations**](#mutations)
  - [*CreatePublicMovieList*](#createpublicmovielist)
  - [*AddMovieToMovieList*](#addmovietomovielist)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `example`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@dataconnect/generated` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## GetPublicMovieLists
You can execute the `GetPublicMovieLists` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getPublicMovieLists(): QueryPromise<GetPublicMovieListsData, undefined>;

interface GetPublicMovieListsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetPublicMovieListsData, undefined>;
}
export const getPublicMovieListsRef: GetPublicMovieListsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getPublicMovieLists(dc: DataConnect): QueryPromise<GetPublicMovieListsData, undefined>;

interface GetPublicMovieListsRef {
  ...
  (dc: DataConnect): QueryRef<GetPublicMovieListsData, undefined>;
}
export const getPublicMovieListsRef: GetPublicMovieListsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getPublicMovieListsRef:
```typescript
const name = getPublicMovieListsRef.operationName;
console.log(name);
```

### Variables
The `GetPublicMovieLists` query has no variables.
### Return Type
Recall that executing the `GetPublicMovieLists` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetPublicMovieListsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetPublicMovieListsData {
  movieLists: ({
    id: UUIDString;
    name: string;
    description?: string | null;
  } & MovieList_Key)[];
}
```
### Using `GetPublicMovieLists`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getPublicMovieLists } from '@dataconnect/generated';


// Call the `getPublicMovieLists()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getPublicMovieLists();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getPublicMovieLists(dataConnect);

console.log(data.movieLists);

// Or, you can use the `Promise` API.
getPublicMovieLists().then((response) => {
  const data = response.data;
  console.log(data.movieLists);
});
```

### Using `GetPublicMovieLists`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getPublicMovieListsRef } from '@dataconnect/generated';


// Call the `getPublicMovieListsRef()` function to get a reference to the query.
const ref = getPublicMovieListsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getPublicMovieListsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.movieLists);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.movieLists);
});
```

## GetMoviesInMovieList
You can execute the `GetMoviesInMovieList` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getMoviesInMovieList(vars: GetMoviesInMovieListVariables): QueryPromise<GetMoviesInMovieListData, GetMoviesInMovieListVariables>;

interface GetMoviesInMovieListRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetMoviesInMovieListVariables): QueryRef<GetMoviesInMovieListData, GetMoviesInMovieListVariables>;
}
export const getMoviesInMovieListRef: GetMoviesInMovieListRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getMoviesInMovieList(dc: DataConnect, vars: GetMoviesInMovieListVariables): QueryPromise<GetMoviesInMovieListData, GetMoviesInMovieListVariables>;

interface GetMoviesInMovieListRef {
  ...
  (dc: DataConnect, vars: GetMoviesInMovieListVariables): QueryRef<GetMoviesInMovieListData, GetMoviesInMovieListVariables>;
}
export const getMoviesInMovieListRef: GetMoviesInMovieListRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getMoviesInMovieListRef:
```typescript
const name = getMoviesInMovieListRef.operationName;
console.log(name);
```

### Variables
The `GetMoviesInMovieList` query requires an argument of type `GetMoviesInMovieListVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetMoviesInMovieListVariables {
  movieListId: UUIDString;
}
```
### Return Type
Recall that executing the `GetMoviesInMovieList` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetMoviesInMovieListData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetMoviesInMovieListData {
  movieList?: {
    movieListItems_on_movieList: ({
      movie: {
        id: UUIDString;
        title: string;
        year: number;
        summary?: string | null;
      } & Movie_Key;
        position: number;
        note?: string | null;
    })[];
  };
}
```
### Using `GetMoviesInMovieList`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getMoviesInMovieList, GetMoviesInMovieListVariables } from '@dataconnect/generated';

// The `GetMoviesInMovieList` query requires an argument of type `GetMoviesInMovieListVariables`:
const getMoviesInMovieListVars: GetMoviesInMovieListVariables = {
  movieListId: ..., 
};

// Call the `getMoviesInMovieList()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getMoviesInMovieList(getMoviesInMovieListVars);
// Variables can be defined inline as well.
const { data } = await getMoviesInMovieList({ movieListId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getMoviesInMovieList(dataConnect, getMoviesInMovieListVars);

console.log(data.movieList);

// Or, you can use the `Promise` API.
getMoviesInMovieList(getMoviesInMovieListVars).then((response) => {
  const data = response.data;
  console.log(data.movieList);
});
```

### Using `GetMoviesInMovieList`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getMoviesInMovieListRef, GetMoviesInMovieListVariables } from '@dataconnect/generated';

// The `GetMoviesInMovieList` query requires an argument of type `GetMoviesInMovieListVariables`:
const getMoviesInMovieListVars: GetMoviesInMovieListVariables = {
  movieListId: ..., 
};

// Call the `getMoviesInMovieListRef()` function to get a reference to the query.
const ref = getMoviesInMovieListRef(getMoviesInMovieListVars);
// Variables can be defined inline as well.
const ref = getMoviesInMovieListRef({ movieListId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getMoviesInMovieListRef(dataConnect, getMoviesInMovieListVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.movieList);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.movieList);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## CreatePublicMovieList
You can execute the `CreatePublicMovieList` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createPublicMovieList(vars: CreatePublicMovieListVariables): MutationPromise<CreatePublicMovieListData, CreatePublicMovieListVariables>;

interface CreatePublicMovieListRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreatePublicMovieListVariables): MutationRef<CreatePublicMovieListData, CreatePublicMovieListVariables>;
}
export const createPublicMovieListRef: CreatePublicMovieListRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createPublicMovieList(dc: DataConnect, vars: CreatePublicMovieListVariables): MutationPromise<CreatePublicMovieListData, CreatePublicMovieListVariables>;

interface CreatePublicMovieListRef {
  ...
  (dc: DataConnect, vars: CreatePublicMovieListVariables): MutationRef<CreatePublicMovieListData, CreatePublicMovieListVariables>;
}
export const createPublicMovieListRef: CreatePublicMovieListRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createPublicMovieListRef:
```typescript
const name = createPublicMovieListRef.operationName;
console.log(name);
```

### Variables
The `CreatePublicMovieList` mutation requires an argument of type `CreatePublicMovieListVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreatePublicMovieListVariables {
  name: string;
  description: string;
}
```
### Return Type
Recall that executing the `CreatePublicMovieList` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreatePublicMovieListData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreatePublicMovieListData {
  movieList_insert: MovieList_Key;
}
```
### Using `CreatePublicMovieList`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createPublicMovieList, CreatePublicMovieListVariables } from '@dataconnect/generated';

// The `CreatePublicMovieList` mutation requires an argument of type `CreatePublicMovieListVariables`:
const createPublicMovieListVars: CreatePublicMovieListVariables = {
  name: ..., 
  description: ..., 
};

// Call the `createPublicMovieList()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createPublicMovieList(createPublicMovieListVars);
// Variables can be defined inline as well.
const { data } = await createPublicMovieList({ name: ..., description: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createPublicMovieList(dataConnect, createPublicMovieListVars);

console.log(data.movieList_insert);

// Or, you can use the `Promise` API.
createPublicMovieList(createPublicMovieListVars).then((response) => {
  const data = response.data;
  console.log(data.movieList_insert);
});
```

### Using `CreatePublicMovieList`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createPublicMovieListRef, CreatePublicMovieListVariables } from '@dataconnect/generated';

// The `CreatePublicMovieList` mutation requires an argument of type `CreatePublicMovieListVariables`:
const createPublicMovieListVars: CreatePublicMovieListVariables = {
  name: ..., 
  description: ..., 
};

// Call the `createPublicMovieListRef()` function to get a reference to the mutation.
const ref = createPublicMovieListRef(createPublicMovieListVars);
// Variables can be defined inline as well.
const ref = createPublicMovieListRef({ name: ..., description: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createPublicMovieListRef(dataConnect, createPublicMovieListVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.movieList_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.movieList_insert);
});
```

## AddMovieToMovieList
You can execute the `AddMovieToMovieList` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
addMovieToMovieList(vars: AddMovieToMovieListVariables): MutationPromise<AddMovieToMovieListData, AddMovieToMovieListVariables>;

interface AddMovieToMovieListRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AddMovieToMovieListVariables): MutationRef<AddMovieToMovieListData, AddMovieToMovieListVariables>;
}
export const addMovieToMovieListRef: AddMovieToMovieListRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
addMovieToMovieList(dc: DataConnect, vars: AddMovieToMovieListVariables): MutationPromise<AddMovieToMovieListData, AddMovieToMovieListVariables>;

interface AddMovieToMovieListRef {
  ...
  (dc: DataConnect, vars: AddMovieToMovieListVariables): MutationRef<AddMovieToMovieListData, AddMovieToMovieListVariables>;
}
export const addMovieToMovieListRef: AddMovieToMovieListRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the addMovieToMovieListRef:
```typescript
const name = addMovieToMovieListRef.operationName;
console.log(name);
```

### Variables
The `AddMovieToMovieList` mutation requires an argument of type `AddMovieToMovieListVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AddMovieToMovieListVariables {
  movieListId: UUIDString;
  movieId: UUIDString;
  position: number;
}
```
### Return Type
Recall that executing the `AddMovieToMovieList` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AddMovieToMovieListData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AddMovieToMovieListData {
  movieListItem_insert: MovieListItem_Key;
}
```
### Using `AddMovieToMovieList`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, addMovieToMovieList, AddMovieToMovieListVariables } from '@dataconnect/generated';

// The `AddMovieToMovieList` mutation requires an argument of type `AddMovieToMovieListVariables`:
const addMovieToMovieListVars: AddMovieToMovieListVariables = {
  movieListId: ..., 
  movieId: ..., 
  position: ..., 
};

// Call the `addMovieToMovieList()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await addMovieToMovieList(addMovieToMovieListVars);
// Variables can be defined inline as well.
const { data } = await addMovieToMovieList({ movieListId: ..., movieId: ..., position: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await addMovieToMovieList(dataConnect, addMovieToMovieListVars);

console.log(data.movieListItem_insert);

// Or, you can use the `Promise` API.
addMovieToMovieList(addMovieToMovieListVars).then((response) => {
  const data = response.data;
  console.log(data.movieListItem_insert);
});
```

### Using `AddMovieToMovieList`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, addMovieToMovieListRef, AddMovieToMovieListVariables } from '@dataconnect/generated';

// The `AddMovieToMovieList` mutation requires an argument of type `AddMovieToMovieListVariables`:
const addMovieToMovieListVars: AddMovieToMovieListVariables = {
  movieListId: ..., 
  movieId: ..., 
  position: ..., 
};

// Call the `addMovieToMovieListRef()` function to get a reference to the mutation.
const ref = addMovieToMovieListRef(addMovieToMovieListVars);
// Variables can be defined inline as well.
const ref = addMovieToMovieListRef({ movieListId: ..., movieId: ..., position: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = addMovieToMovieListRef(dataConnect, addMovieToMovieListVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.movieListItem_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.movieListItem_insert);
});
```

