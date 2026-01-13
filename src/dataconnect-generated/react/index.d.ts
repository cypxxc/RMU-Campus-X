import { CreatePublicMovieListData, CreatePublicMovieListVariables, GetPublicMovieListsData, AddMovieToMovieListData, AddMovieToMovieListVariables, GetMoviesInMovieListData, GetMoviesInMovieListVariables } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions, UseDataConnectMutationResult, useDataConnectMutationOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult, UseMutationResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useCreatePublicMovieList(options?: useDataConnectMutationOptions<CreatePublicMovieListData, FirebaseError, CreatePublicMovieListVariables>): UseDataConnectMutationResult<CreatePublicMovieListData, CreatePublicMovieListVariables>;
export function useCreatePublicMovieList(dc: DataConnect, options?: useDataConnectMutationOptions<CreatePublicMovieListData, FirebaseError, CreatePublicMovieListVariables>): UseDataConnectMutationResult<CreatePublicMovieListData, CreatePublicMovieListVariables>;

export function useGetPublicMovieLists(options?: useDataConnectQueryOptions<GetPublicMovieListsData>): UseDataConnectQueryResult<GetPublicMovieListsData, undefined>;
export function useGetPublicMovieLists(dc: DataConnect, options?: useDataConnectQueryOptions<GetPublicMovieListsData>): UseDataConnectQueryResult<GetPublicMovieListsData, undefined>;

export function useAddMovieToMovieList(options?: useDataConnectMutationOptions<AddMovieToMovieListData, FirebaseError, AddMovieToMovieListVariables>): UseDataConnectMutationResult<AddMovieToMovieListData, AddMovieToMovieListVariables>;
export function useAddMovieToMovieList(dc: DataConnect, options?: useDataConnectMutationOptions<AddMovieToMovieListData, FirebaseError, AddMovieToMovieListVariables>): UseDataConnectMutationResult<AddMovieToMovieListData, AddMovieToMovieListVariables>;

export function useGetMoviesInMovieList(vars: GetMoviesInMovieListVariables, options?: useDataConnectQueryOptions<GetMoviesInMovieListData>): UseDataConnectQueryResult<GetMoviesInMovieListData, GetMoviesInMovieListVariables>;
export function useGetMoviesInMovieList(dc: DataConnect, vars: GetMoviesInMovieListVariables, options?: useDataConnectQueryOptions<GetMoviesInMovieListData>): UseDataConnectQueryResult<GetMoviesInMovieListData, GetMoviesInMovieListVariables>;
