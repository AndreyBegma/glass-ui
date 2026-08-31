/**
 * A side-effect stylesheet import has no type, and this package is compiled by
 * whatever bundles the application rather than by a build of its own — so
 * unlike an application, there is no framework here to declare it. Two
 * primitives import their own keyframes; this is what lets them.
 */
declare module '*.css';
